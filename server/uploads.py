"""Bound HTTP bodies and XLSX expansion before handing data to parsers."""
import io
import re
import zipfile

MAX_BODY = 4 * 1024 * 1024
MAX_EXPANDED = 24 * 1024 * 1024


def bounded_body(handler):
    try:
        length = int(handler.headers.get("Content-Length", "0"))
    except ValueError:
        raise ValueError("Dimensione richiesta non valida.")
    if length <= 0 or length > MAX_BODY:
        raise ValueError("File assente o troppo grande (massimo 4 MB).")
    body = handler.rfile.read(length)
    if len(body) != length:
        raise ValueError("Caricamento incompleto.")
    return io.BytesIO(body)


def validate_xlsx(data):
    try:
        with zipfile.ZipFile(io.BytesIO(data)) as archive:
            members = archive.infolist()
            if len(members) > 1000 or sum(m.file_size for m in members) > MAX_EXPANDED:
                raise ValueError("Workbook troppo grande.")
            total_cells = 0
            for member in members:
                if member.flag_bits & 1:
                    raise ValueError("Workbook cifrato non supportato.")
                if member.filename.startswith("xl/worksheets/") and member.filename.endswith(".xml"):
                    xml = archive.read(member)
                    import xml.etree.ElementTree as ET
                    if b"<!DOCTYPE" in xml.upper() or b"<!ENTITY" in xml.upper():
                        raise ValueError("Dichiarazioni XML non consentite.")
                    root = ET.fromstring(xml)
                    max_row, max_column = 1, 1
                    merged_cells = 0
                    for element in root.iter():
                        tag = element.tag.rsplit("}", 1)[-1]
                        reference = element.get("ref") if tag in ("dimension", "mergeCell") else element.get("r") if tag == "c" else None
                        if not reference:
                            continue
                        coordinates = []
                        for coordinate in reference.split(":"):
                            match = re.fullmatch(r"([A-Z]+)([0-9]+)", coordinate)
                            if not match:
                                raise ValueError("Dimensioni workbook non valide.")
                            column = 0
                            for char in match.group(1):
                                column = column * 26 + ord(char) - 64
                            max_column = max(max_column, column)
                            max_row = max(max_row, int(match.group(2)))
                            coordinates.append((column, int(match.group(2))))
                            if max_column * max_row > 250000:
                                raise ValueError("Workbook oltre il limite di celle.")
                        if tag == "mergeCell":
                            first, last = coordinates[0], coordinates[-1]
                            merged_cells += (abs(last[0] - first[0]) + 1) * (abs(last[1] - first[1]) + 1)
                            if merged_cells > 250000:
                                raise ValueError("Troppe celle unite.")
                    total_cells += max_column * max_row
                    if total_cells > 500000:
                        raise ValueError("Workbook oltre il limite totale di celle.")
    except zipfile.BadZipFile:
        raise ValueError("File XLSX non valido.")


def read_multipart(handler):
    # email's MIME parser replaces cgi.FieldStorage, removed in Python 3.13.
    from email.parser import BytesParser
    from email.policy import default
    from types import SimpleNamespace
    content_type = handler.headers.get("Content-Type", "")
    if "\r" in content_type or "\n" in content_type:
        raise ValueError("Content-Type non valido.")
    body = bounded_body(handler).read()
    message = BytesParser(policy=default).parsebytes(
        ("Content-Type: " + content_type + "\r\nMIME-Version: 1.0\r\n\r\n").encode("ascii") + body)
    if message.get_content_type() != "multipart/form-data" or not message.is_multipart():
        raise ValueError("Modulo multipart richiesto.")

    class Form(dict):
        def getfirst(self, key):
            return self[key].value if key in self else None

    form = Form()
    for part in message.iter_parts():
        name = part.get_param("name", header="content-disposition")
        if name not in ("excel", "txt", "output") or name in form or part.is_multipart():
            raise ValueError("Campo caricamento non valido.")
        payload = part.get_payload(decode=True)
        if payload is None:
            raise ValueError("Caricamento non valido.")
        form[name] = SimpleNamespace(file=io.BytesIO(payload), value=payload.decode("utf-8") if name == "output" else None)
    return form
