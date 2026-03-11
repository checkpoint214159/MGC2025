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

    # 3. Move the pointer to the start of the buffer
    file_buffer.seek(0)
    
    # Now you can use file_buffer exactly like an open('file.txt', 'rb') object
    # For example, reading it as text:
    # content = file_buffer.read().decode('utf-8')

    
    content = read_pdf_with_fitz(file_buffer)
    
    return content