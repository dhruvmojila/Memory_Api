import io
from fastapi import UploadFile, HTTPException, status
from langchain_community.document_loaders import PyPDFLoader, Docx2txtLoader
from docx import Document
import tempfile

async def parse_file_in_memory(file: UploadFile) -> str:
    """
    Parses an uploaded file (PDF, DOCX, TXT) in memory
    and returns its text content.
    """
    content_type = file.content_type
    file_bytes = await file.read()

    if not file_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")
    
    # Use BytesIO to treat the byte string as a file
    file_like_object = io.BytesIO(file_bytes)
    
    # We must reset the file pointer after reading
    await file.seek(0)
    
    try:
        if content_type == "application/pdf":
            with tempfile.NamedTemporaryFile(delete=True, suffix=".pdf") as tmp:
                tmp.write(file_bytes)
                tmp.flush()
                loader = PyPDFLoader(tmp.name)
                docs = loader.load()
            
            # Note: For full async, one would use loader.aload()
            # or run loader.load() in a threadpool
            
            return "\n\n".join([doc.page_content for doc in docs])

        elif content_type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
            # python-docx can read from a file-like object [11, 12]
            # LangChain's loader simplifies this [13, 14]
            
            # Docx2txtLoader needs a path. To stay in memory,
            # we can pass the file-like object directly to python-docx
            document = Document(file_like_object)
            return "\n\n".join([para.text for para in document.paragraphs])

        elif content_type == "text/plain":
            return file_bytes.decode('utf-8')
        
        else:
            raise HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail=f"Unsupported file type: {content_type}"
            )
    except Exception as e:
        # Handle parsing errors
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to parse file {file.filename}: {str(e)}"
        )
