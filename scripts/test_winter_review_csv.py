"""Offline CSV validation tests; source CSV is never modified."""
import copy
import csv
import tempfile
import unittest
from pathlib import Path
from prepare_winter_review_import import CSV, COLUMNS, read_bank


class ReviewCsvTest(unittest.TestCase):
    def setUp(self):
        with CSV.open(encoding="utf-8-sig", newline="") as stream:
            self.rows = list(csv.DictReader(stream))

    def read_rows(self, rows):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "test.csv"
            with path.open("w", encoding="utf-8-sig", newline="") as stream:
                writer = csv.DictWriter(stream, fieldnames=COLUMNS)
                writer.writeheader()
                writer.writerows(rows)
            return read_bank(path)

    def test_current_bank_and_stable_rewording(self):
        bank = read_bank(CSV)
        self.assertEqual(len(bank), 49)
        self.assertEqual(sum(row["is_model_question"] for row in bank), 36)
        self.assertEqual(bank[0]["choices"], ["True", "False"])
        revised = copy.deepcopy(self.rows)
        revised[0]["prompt"] = "Reworded question with Hebrew: חלה, apostrophe's, and \"quotes\"."
        self.assertEqual(self.read_rows(revised)[0]["id"], bank[0]["id"])
        self.assertEqual(self.read_rows(revised)[0]["prompt"], revised[0]["prompt"])

    def test_invalid_values(self):
        cases = [
            ("correct_answer", "Not the selected answer"), ("correct_choice", "D"),
            ("is_model_question", "YES"), ("question_type", "essay"),
            ("week", "5"), ("section", "X"), ("difficulty", "unknown"),
            ("choice_c", "Third True/False choice"), ("explanation", "")
        ]
        for key, value in cases:
            with self.subTest(key=key):
                revised = copy.deepcopy(self.rows)
                revised[0][key] = value
                with self.assertRaises(ValueError):
                    self.read_rows(revised)

    def test_duplicates_and_missing_mc_choice(self):
        with self.assertRaisesRegex(ValueError, "duplicate"):
            self.read_rows(self.rows + [self.rows[0]])
        revised = copy.deepcopy(self.rows)
        revised[1]["choice_d"] = ""
        with self.assertRaisesRegex(ValueError, "four distinct"):
            self.read_rows(revised)


if __name__ == "__main__":
    unittest.main()
