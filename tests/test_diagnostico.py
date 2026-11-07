"""El diagnóstico no revela errores internos ni escribe SQL."""
import json
from unittest import TestCase
from unittest.mock import patch

from scripts.diagnostico import REQUERIDAS, revisar_entorno, revisar_columnas_sql


class DiagnosticoTests(TestCase):
    @patch("scripts.diagnostico.obtener_conexion")
    def test_entorno_no_abre_sql_ni_muestra_secretos(self, conectar):
        with patch.dict("os.environ", {"GROQ_API_KEY": "NO-MOSTRAR-ESTA-CLAVE"}):
            resultado = revisar_entorno()
        conectar.assert_not_called()
        self.assertFalse(resultado["conexion_sql_probada"])
        self.assertNotIn("NO-MOSTRAR", json.dumps(resultado))

    @patch("scripts.diagnostico.obtener_conexion")
    def test_metadatos_solo_select_y_cierre(self, conectar):
        conexion = conectar.return_value
        conexion.cursor.return_value.fetchall.return_value = [
            (tabla, columna) for tabla, columnas in REQUERIDAS.items() for columna in columnas]
        resultado = revisar_columnas_sql()
        self.assertTrue(resultado["conexion_sql_probada"])
        self.assertTrue(resultado["columnas_requeridas_presentes"])
        sql, parametros = conexion.cursor.return_value.execute.call_args.args
        self.assertTrue(sql.lstrip().startswith("SELECT"))
        self.assertEqual(parametros, ("dbo",))
        conexion.commit.assert_not_called()
        conexion.rollback.assert_not_called()
        conexion.close.assert_called_once()

    @patch("scripts.diagnostico.obtener_conexion")
    def test_esquema_incompleto_no_se_presenta_como_compatible(self, conectar):
        conectar.return_value.cursor.return_value.fetchall.return_value = []
        resultado = revisar_columnas_sql()
        self.assertFalse(resultado["columnas_requeridas_presentes"])
        self.assertIn("VentasSolicitudes", resultado["columnas_faltantes"])

    @patch("scripts.diagnostico.obtener_conexion")
    def test_error_de_consulta_cierra_sin_filtrar_detalles(self, conectar):
        conectar.return_value.cursor.return_value.execute.side_effect = RuntimeError("credencial privada")
        resultado = revisar_columnas_sql()
        self.assertFalse(resultado["conexion_sql_probada"])
        self.assertNotIn("credencial", json.dumps(resultado))
        conectar.return_value.close.assert_called_once()
