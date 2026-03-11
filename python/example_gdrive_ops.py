from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google.oauth2 import service_account
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from ingestion.gdrive_utils import read_file_to_memory
import os

SCOPES = ['https://www.googleapis.com/auth/drive.readonly']
SERVICE_ACCOUNT_FILE = 'service_account.json'

# funcs from gemini. must slowly digest and learn them, how to query google drive
def find_folder_id(service, folder_name):
    query = f"name = '{folder_name}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false"
    results = service.files().list(q=query, spaces='drive', fields='files(id, name)').execute()
    items = results.get('files', [])
    return items[0]['id'] if items else None

def list_files_in_folder(service, folder_id):
    query = f"'{folder_id}' in parents and trashed = false"
    results = service.files().list(q=query, fields='files(id, name, mimeType)').execute()
    return results.get('files', [])

def ingest_files(service, files: list[dict]):
    for file in files:
        if file['mimeType'] == 'application/pdf':
            print('filename?', file['name'])
            read_file_to_memory(service, file['id'])

def main():
    # get creds from token.json
    creds = service_account.Credentials.from_service_account_file(
        SERVICE_ACCOUNT_FILE, scopes=SCOPES)

    # builds the service object
    service = build("drive", "v3", credentials=creds)

    mgc_id = find_folder_id(service, folder_name="Journal of Pain, The_20260220")
    print('mgcid?', mgc_id)
    files = list_files_in_folder(service, mgc_id)
    ingest_files(service, files)
    print('files:', files)

main()