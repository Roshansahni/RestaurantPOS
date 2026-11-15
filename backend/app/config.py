from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    database_url: str = "sqlite:///./dev.db"
    jwt_secret: str = "dev-only-change-me"
    access_minutes: int = 30
    cors_origins: str = "http://localhost:5173"
    upload_dir: str = "./uploads"

settings = Settings()
