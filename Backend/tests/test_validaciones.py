from decimal import Decimal

import pytest

from cotizaciones import fecha_valida, numero_decimal
from domain import password_hash, password_matches, required_text


def test_password_se_guarda_como_hash():
    resultado = password_hash("Prueba1234")
    assert resultado != "Prueba1234"
    assert password_matches("Prueba1234", resultado)


def test_password_incorrecta_no_coincide():
    resultado = password_hash("Prueba1234")
    assert not password_matches("OtraClave123", resultado)


def test_texto_obligatorio_rechaza_vacio():
    with pytest.raises(ValueError):
        required_text("   ", "El nombre")


def test_cantidad_rechaza_cero():
    with pytest.raises(ValueError):
        numero_decimal(0, "La cantidad", permitir_cero=False)


def test_precio_acepta_cero():
    assert numero_decimal(0, "El precio") == Decimal("0")


def test_fecha_iso_valida():
    assert fecha_valida("2026-09-08", "La fecha").isoformat() == "2026-09-08"


def test_fecha_invalida():
    with pytest.raises(ValueError):
        fecha_valida("08-09-2026", "La fecha")
