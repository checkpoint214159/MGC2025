import io
import json
from googleapiclient.http import MediaIoBaseDownload
import fitz


def read_pdf_with_fitz(file_buffer):
    file_buffer.seek(0)
    
    # Open the document directly from memory
    # stream=... and filetype="pdf" are the keys here
    doc = fitz.open(stream=file_buffer, filetype="pdf")
    
    text = ""
    for page in doc:
        text += page.get_text()
        
    doc.close()
    return text

def read_file_to_memory(service, file_id):

    request = service.files().get_media(fileId=file_id)
    
    file_buffer = io.BytesIO()
    downloader = MediaIoBaseDownload(file_buffer, request)
    
    done = False
    while not done:
        status, done = downloader.next_chunk()
        print(f"Download {int(status.progress() * 100)}%.")

    # point to start of the buffer
    file_buffer.seek(0)
    content = read_pdf_with_fitz(file_buffer)
    
    return content

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
        else:
            print("MINDLESS PASS, TODO RESOLVE VARIOUS FILETYPES LATER")

