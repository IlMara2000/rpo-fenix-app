import os
import unittest
from unittest import mock

from server.security import AuthError, _bearer_token, require_active_user


class BearerTokenTests(unittest.TestCase):
    def test_reads_bearer_header(self):
        self.assertEqual(_bearer_token({"authorization": "Bearer abc.def"}), "abc.def")
        self.assertEqual(_bearer_token({"Authorization": "bearer xyz"}), "xyz")

    def test_rejects_missing_or_malformed_header(self):
        for headers in ({}, {"authorization": ""}, {"authorization": "abc"}, {"authorization": "Basic abc"}):
            self.assertEqual(_bearer_token(headers), "")


class RequireActiveUserTests(unittest.TestCase):
    def test_missing_token_is_rejected_before_any_network_call(self):
        with mock.patch("server.security._get_json") as upstream:
            with self.assertRaises(AuthError) as raised:
                require_active_user({})
        self.assertEqual(raised.exception.status_code, 401)
        upstream.assert_not_called()

    def test_missing_configuration_fails_closed(self):
        with mock.patch.dict(os.environ, {}, clear=True):
            with self.assertRaises(AuthError) as raised:
                require_active_user({"authorization": "Bearer token"})
        self.assertEqual(raised.exception.status_code, 503)

    def test_active_profile_is_accepted(self):
        responses = [{"id": "user-1", "email": "agente@example.com"}, [{"status": "Attivo"}]]
        with mock.patch.dict(os.environ, {"SUPABASE_URL": "https://project.supabase.co",
                                          "SUPABASE_PUBLISHABLE_KEY": "sb_publishable_key"}, clear=True):
            with mock.patch("server.security._get_json", side_effect=responses) as upstream:
                user = require_active_user({"authorization": "Bearer token"})
        self.assertEqual(user, {"id": "user-1", "email": "agente@example.com"})
        self.assertEqual(upstream.call_count, 2)

    def test_suspended_profile_is_rejected(self):
        responses = [{"id": "user-1", "email": "agente@example.com"}, [{"status": "Sospeso"}]]
        with mock.patch.dict(os.environ, {"SUPABASE_URL": "https://project.supabase.co",
                                          "SUPABASE_PUBLISHABLE_KEY": "sb_publishable_key"}, clear=True):
            with mock.patch("server.security._get_json", side_effect=responses):
                with self.assertRaises(AuthError) as raised:
                    require_active_user({"authorization": "Bearer token"})
        self.assertEqual(raised.exception.status_code, 403)

    def test_missing_profile_is_rejected(self):
        responses = [{"id": "user-1", "email": "agente@example.com"}, []]
        with mock.patch.dict(os.environ, {"SUPABASE_URL": "https://project.supabase.co",
                                          "SUPABASE_PUBLISHABLE_KEY": "sb_publishable_key"}, clear=True):
            with mock.patch("server.security._get_json", side_effect=responses):
                with self.assertRaises(AuthError) as raised:
                    require_active_user({"authorization": "Bearer token"})
        self.assertEqual(raised.exception.status_code, 403)

    def test_invalid_session_is_rejected(self):
        import urllib.error

        with mock.patch.dict(os.environ, {"SUPABASE_URL": "https://project.supabase.co",
                                          "SUPABASE_PUBLISHABLE_KEY": "sb_publishable_key"}, clear=True):
            with mock.patch("server.security._get_json",
                            side_effect=urllib.error.HTTPError("url", 401, "Unauthorized", {}, None)):
                with self.assertRaises(AuthError) as raised:
                    require_active_user({"authorization": "Bearer token"})
        self.assertEqual(raised.exception.status_code, 401)


if __name__ == "__main__":
    unittest.main()
