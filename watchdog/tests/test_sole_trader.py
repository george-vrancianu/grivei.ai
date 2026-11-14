"""The shared sole-trader rule (#176; BaniPartide's #182 reads it too): a registration named after a natural person is never searchable by name."""
import pytest

from pipeline.sole_trader import is_sole_trader


@pytest.mark.parametrize("name, form", [
    ("IONESCU ALFA PFA", "PFA"), ("VASILESCU MARIA ALFA II", "II"), ("POPESCU DEMO IF", "IF"),
    ("DEMETER", "PERSOANA FIZICA AUTORIZATA"), ("DEMO", "INTREPRINDERE INDIVIDUALA"), ("DEMO", "INTREPRINDERE FAMILIALA"),
    ("DEMO", "P.F.A."), ("DEMO", "i.i."),
    ("POPESCU ION PERSOANĂ FIZICĂ AUTORIZATĂ", None), ("ION POPESCU PFA", None), ("P.F.A. DEMO", None), ("DEMO ÎNTREPRINDERE INDIVIDUALĂ", None), ("DEMO I.I.", None),
])
def test_a_sole_trader_is_told_by_its_legal_form_or_its_name(name, form):
    assert is_sole_trader(name, form)


@pytest.mark.parametrize("name, form", [
    ("ALFA ONRC SRL", "SRL"), ("DEMO II SRL", None), ("DUBLA ONRC SA", "SA"), ("PRIMARIA EXEMPLU ONRC", "ADMINISTRATIE"), ("ASOCIATIA FAMILIALA", "ONG"), (None, None), ("", ""),
])
def test_a_company_or_an_institution_is_not(name, form):
    assert not is_sole_trader(name, form)
