import unittest
from unittest.mock import patch, Mock
from divider.octoprint_connector import connect_octoprint, disconnect_octoprint, get_connection, is_octoprint_server, is_octoprint_connected

class TestOctoPrintConnector(unittest.TestCase):

    @patch('divider.octoprint_connector.requests.post')
    @patch('divider.octoprint_connector.is_octoprint_server', return_value=True)
    def test_connect_octoprint(self, mock_is_octoprint_server, mock_post):
        mock_post.return_value.status_code = 204
        connect_octoprint('127.0.0.1', 'fake_api_key')
        mock_post.assert_called_once()
        self.assertTrue(mock_is_octoprint_server.called)

    @patch('divider.octoprint_connector.requests.post')
    @patch('divider.octoprint_connector.is_octoprint_server', return_value=True)
    def test_disconnect_octoprint(self, mock_is_octoprint_server, mock_post):
        mock_post.return_value.status_code = 204
        disconnect_octoprint('127.0.0.1', 'fake_api_key')
        mock_post.assert_called_once()
        self.assertTrue(mock_is_octoprint_server.called)

    @patch('divider.octoprint_connector.requests.get')
    @patch('divider.octoprint_connector.is_octoprint_server', return_value=True)
    def test_get_connection(self, mock_is_octoprint_server, mock_get):
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {'current': {'state': 'Operational'}}
        mock_get.return_value = mock_response
        connection_info = get_connection('127.0.0.1', 'fake_api_key')
        self.assertEqual(connection_info['current']['state'], 'Operational')
        self.assertTrue(mock_is_octoprint_server.called)

    @patch('divider.octoprint_connector.requests.get')
    def test_is_octoprint_server(self, mock_get):
        mock_response = Mock()
        mock_response.status_code = 200
        mock_get.return_value = mock_response
        result = is_octoprint_server('127.0.0.1', 'fake_api_key')
        self.assertTrue(result)
        mock_get.assert_called_once()

    @patch('divider.octoprint_connector.get_connection')
    def test_is_octoprint_connected(self, mock_get_connection):
        mock_get_connection.return_value = {'current': {'state': 'Operational'}}
        result = is_octoprint_connected('127.0.0.1', 'fake_api_key')
        self.assertTrue(result)
        mock_get_connection.assert_called_once()

if __name__ == '__main__':
    unittest.main()