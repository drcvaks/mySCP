"""Validate the reviewed CSV and generate a Winter-only public-library import, offline."""
import argparse
import csv
import hashlib
import json
import uuid
from collections import Counter
from pathlib import Path

CSV = Path("Content/Hafrashas Challah Part 1/mySCP_Winter5787_Hafrashas_Challah_Part1_Question_Bank_DIVERSE_ANSWERS - fixed.csv")
SQL = Path("supabase/imports/202610120001_winter_challah_part1_review_questions.sql")
NAMESPACE = uuid.UUID("080dbdb7-9206-512e-909f-d20ae0e03b32")
COLUMNS = "week section topic difficulty question_type prompt choice_a choice_b choice_c choice_d correct_choice correct_answer explanation is_model_question".split()


def read_bank(path):
    rows, identities, prompts = [], set(), set()
    with path.open(encoding="utf-8-sig", newline="") as stream:
        reader = csv.DictReader(stream, strict=True)
        if reader.fieldnames != COLUMNS:
            raise ValueError("CSV columns must be: " + ",".join(COLUMNS))
        for number, raw in enumerate(reader, 2):
            if None in raw or any(value is None for value in raw.values()):
                raise ValueError(f"CSV record {number}: wrong column count")
            row = {key: value.strip() for key, value in raw.items()}
            for key in ("week", "section", "topic", "difficulty", "question_type", "prompt", "choice_a", "choice_b", "correct_choice", "correct_answer", "explanation", "is_model_question"):
                if not row[key]:
                    raise ValueError(f"CSV record {number}: missing {key}")
            if row["week"] not in {"1", "2", "3", "4"} or row["section"] not in set("ABCDEFG"):
                raise ValueError(f"CSV record {number}: this bank covers Weeks 1-4 / Sections A-G only")
            if row["difficulty"] not in {"easy", "medium", "hard"}:
                raise ValueError(f"CSV record {number}: unsupported difficulty")
            if row["is_model_question"].upper() not in {"TRUE", "FALSE"}:
                raise ValueError(f"CSV record {number}: model flag must be TRUE or FALSE")
            if row["question_type"] == "true_false":
                if [row["choice_a"].upper(), row["choice_b"].upper()] != ["TRUE", "FALSE"] or row["choice_c"] or row["choice_d"]:
                    raise ValueError(f"CSV record {number}: True/False requires TRUE,FALSE and empty C,D")
                choices = ["True", "False"]
                original_choices = [row["choice_a"], row["choice_b"]]
            elif row["question_type"] == "multiple_choice":
                choices = [row[f"choice_{letter}"] for letter in "abcd"]
                original_choices = choices
                if not all(choices) or len({choice.casefold() for choice in choices}) != 4:
                    raise ValueError(f"CSV record {number}: four distinct nonempty choices required")
            else:
                raise ValueError(f"CSV record {number}: invalid question_type")
            letter = row["correct_choice"]
            if letter not in "ABCD" or len(letter) != 1 or "ABCD".index(letter) >= len(choices):
                raise ValueError(f"CSV record {number}: correct_choice outside available choices")
            index = "ABCD".index(letter)
            if original_choices[index].casefold() != row["correct_answer"].casefold():
                raise ValueError(f"CSV record {number}: correct_answer disagrees with correct_choice")
            identity = json.dumps([row["week"], row["section"], row["topic"]], ensure_ascii=False)
            prompt_key = row["prompt"].casefold()
            if identity in identities or prompt_key in prompts:
                raise ValueError(f"CSV record {number}: duplicate topic identity or prompt")
            identities.add(identity)
            prompts.add(prompt_key)
            rows.append({
                "id": str(uuid.uuid5(NAMESPACE, identity)), "week": int(row["week"]),
                "topic": f"Hafrashas Challah Part 1 - Section {row['section']} - {row['topic']}",
                "prompt": row["prompt"], "kind": row["question_type"], "choices": choices,
                "correct_choice_index": index, "explanation": row["explanation"],
                "is_model_question": row["is_model_question"].upper() == "TRUE",
                "section": row["section"], "difficulty": row["difficulty"]
            })
    if not rows:
        raise ValueError("CSV contains no questions")
    return rows


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--csv", type=Path, default=CSV)
    parser.add_argument("--sql", type=Path, default=SQL)
    args = parser.parse_args()
    rows = read_bank(args.csv)
    payload = json.dumps(rows, ensure_ascii=False, indent=2)
    if "$winter_bank$" in payload:
        raise ValueError("Reserved SQL payload delimiter appears in CSV text")
    template = Path(__file__).with_name("winter_review_import_template.sql").read_text(encoding="utf-8")
    sql = template.replace("__BANK_JSON__", payload).replace("__ROW_COUNT__", str(len(rows)))
    digest = hashlib.sha256(args.csv.read_bytes()).hexdigest()
    sql = f"-- Source CSV SHA-256: {digest}\n" + sql
    args.sql.parent.mkdir(parents=True, exist_ok=True)
    args.sql.write_text(sql, encoding="utf-8", newline="\n")
    print(f"Prepared {args.sql}: {len(rows)} questions; {sum(row['is_model_question'] for row in rows)} model")
    for week in sorted({row["week"] for row in rows}):
        group = [row for row in rows if row["week"] == week]
        print(f"Week {week}: {len(group)} total / {sum(row['is_model_question'] for row in group)} model")
    tf = [row for row in rows if row["kind"] == "true_false"]
    print("True/False keys:", dict(Counter(row["choices"][row["correct_choice_index"]] for row in tf)))
    print("No network or database changes performed.")


if __name__ == "__main__":
    main()
