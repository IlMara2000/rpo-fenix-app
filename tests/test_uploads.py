import io
import unittest
import zipfile
from server.uploads import bounded_body, validate_xlsx, read_multipart


def workbook(xml):
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as archive:
        archive.writestr("xl/worksheets/sheet1.xml", xml)
    return buffer.getvalue()


class UploadTests(unittest.TestCase):
    def test_regular_sheet(self):
        validate_xlsx(workbook('<worksheet><dimension ref="A1:B20"/></worksheet>'))

    def test_sparse_and_declared_large_sheet(self):
        for xml in ['<worksheet><dimension ref="A1:XFD1048576"/></worksheet>',
                    '<worksheet><dimension ref="A1"/><mergeCells><mergeCell ref="A1:XFD1048576"/></mergeCells></worksheet>',
                    '<worksheet><dimension ref="A1"/><sheetData><c r="XFD1048576"/></sheetData></worksheet>']:
            with self.assertRaises(ValueError):
                validate_xlsx(workbook(xml))

    def test_zip_amplification(self):
        with self.assertRaises(ValueError):
            validate_xlsx(workbook("x" * (25 * 1024 * 1024)))

    def test_body_limit_before_read(self):
        class Request:
            headers = {"Content-Length": "99999999"}
            rfile = io.BytesIO(b"")
        with self.assertRaises(ValueError):
            bounded_body(Request())

    def test_multipart(self):
        body = b'--test\r\nContent-Disposition: form-data; name="txt"; filename="list.txt"\r\nContent-Type: text/plain\r\n\r\n12345\r\n--test\r\nContent-Disposition: form-data; name="output"\r\n\r\ntxt\r\n--test--\r\n'
        class Request:
            headers = {"Content-Length": str(len(body)), "Content-Type": "multipart/form-data; boundary=test"}
            rfile = io.BytesIO(body)
        form = read_multipart(Request())
        self.assertEqual(form["txt"].file.read(), b"12345")
        self.assertEqual(form.getfirst("output"), "txt")


if __name__ == "__main__":
    unittest.main()
