
import os

from dotenv import load_dotenv
from supabase import Client, create_client

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SECRET_KEY = os.getenv("SUPABASE_SECRET_KEY")


def get_supabase_client() -> Client:
    if not SUPABASE_URL or not SUPABASE_SECRET_KEY:
        raise RuntimeError(
            "SUPABASE_URL or SUPABASE_SECRET_KEY is missing "
            "from backend/.env"
        )

    return create_client(SUPABASE_URL, SUPABASE_SECRET_KEY)
