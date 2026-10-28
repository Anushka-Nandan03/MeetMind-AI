
import os

from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SECRET_KEY")

if not url or not key:
    raise RuntimeError(
        "SUPABASE_URL or SUPABASE_SECRET_KEY is missing in backend/.env"
    )

supabase = create_client(url, key)

result = (
    supabase.table("meetings")
    .select("id")
    .limit(1)
    .execute()
)

print("Supabase connection successful!")
print("Meetings table is accessible.")
print("Rows returned:", len(result.data))
