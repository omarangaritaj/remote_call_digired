from sqlalchemy import (
    create_engine,
    MetaData,
    Table,
    Column,
    Integer,
    String,
    DateTime,
    func
)
from sqlalchemy.engine import Engine

# Configuración de metadatos
metadata = MetaData()

# Definición de la tabla users
users_table = Table(
    "users",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("userId", String, unique=True, nullable=False),
    Column("location", String, nullable=False),  # JSON string
    Column("accessToken", String, nullable=False),
    Column("switchInput", Integer, nullable=False),
    Column("createdAt", DateTime, default=func.now()),
    Column("updatedAt", DateTime, default=func.now(), onupdate=func.now()),
)

class Database:
    def __init__(self):
        # Crear engine para base de datos en memoria
        self.engine: Engine = create_engine(
            "sqlite://database.db",  # Cambia a "sqlite:///:memory:" para usar en memoria
            echo=True  # Para ver las consultas SQL en consola
        )
        # Crear todas las tablas
        metadata.create_all(self.engine)

    def connect(self):
        """Retorna una conexión a la base de datos"""
        return self.engine.connect()

    def get_engine(self):
        """Retorna el engine de SQLAlchemy"""
        return self.engine

    def fetch_one(self, query):
        """Ejecuta una consulta y retorna un único resultado"""
        with self.engine.connect() as connection:
            result = connection.execute(query)
            return result.fetchone()

    def fetch_all(self, query):
        """Ejecuta una consulta y retorna todos los resultados"""
        with self.engine.connect() as connection:
            result = connection.execute(query)
            return result.fetchall()

    def execute(self, query):
        """Ejecuta una consulta sin retornar resultados"""
        with self.engine.connect() as connection:
            connection.execute(query)

# Exportar la instancia de database
database = Database()
