import sys
import os
import unittest
from unittest.mock import patch, Mock
import tempfile

from octoprint_files import post_select_file, get_all_files, upload_gcode_file, delete_file

class TestOctoPrintFiles(unittest.TestCase):

    @patch('octoprint_files.requests.post')
    @patch('octoprint_files.get_all_files')
    def test_post_select_file(self, mock_get_all_files, mock_post):
        mock_get_all_files.return_value = {"files": [{"display": "test.gcode"}]}
        mock_post.return_value.status_code = 200
        response = post_select_file('127.0.0.1', 'fake_api_key', 'test.gcode')
        self.assertIsNotNone(response)
        mock_post.assert_called_once()

    @patch('octoprint_files.requests.get')
    def test_get_all_files(self, mock_get):
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"files": [{"display": "test.gcode"}]}
        mock_get.return_value = mock_response
        files = get_all_files('127.0.0.1', 'fake_api_key')
        self.assertEqual(files["files"][0]["display"], "test.gcode")
        mock_get.assert_called_once()

    # @patch('octoprint_files.requests.post')
    # @patch('octoprint_files.encoder.MultipartEncoder')
    # @patch('octoprint_files.encoder.MultipartEncoderMonitor')
    # def test_upload_gcode_file(self, mock_monitor, mock_encoder, mock_post):
    #     mock_post.return_value.status_code = 200
    #     mock_post.return_value.json.return_value = {"done": True}
    #     mock_encoder.return_value = Mock()
    #     mock_monitor.return_value = Mock()
    #
    #     # Create a temporary file to simulate the G-code file
    #     with tempfile.NamedTemporaryFile(delete=False) as temp_file:
    #         temp_file.write(b'This is a test G-code file.')
    #         temp_file_path = temp_file.name
    #
    #     try:
    #         response = upload_gcode_file('127.0.0.1', 'fake_api_key', temp_file_path)
    #         self.assertTrue(response["done"])
    #         mock_post.assert_called_once()
    #     finally:
    #         temp_file.close()
    #         if os.path.exists(temp_file_path):
    #             os.remove(temp_file_path)

    @patch('octoprint_files.requests.delete')
    def test_delete_file(self, mock_delete):
        mock_delete.return_value.status_code = 204
        response = delete_file('127.0.0.1', 'fake_api_key', 'test.gcode')
        self.assertIsNotNone(response)
        mock_delete.assert_called_once()

if __name__ == '__main__':
    unittest.main()
