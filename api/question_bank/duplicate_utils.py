import hashlib
import re


def normalize_text(text):
    """Normalize text for comparison: lowercase, trim, and collapse whitespace."""
    if not text:
        return ""
    return re.sub(r"\s+", " ", str(text).strip().lower())


def compute_fingerprint(prompt, options_texts):
    """
    Compute a stable fingerprint from a prompt and option texts.
    Options are sorted so multiple-choice order changes do not bypass duplicate checks.
    """
    normalized_prompt = normalize_text(prompt)
    normalized_options = sorted(normalize_text(text) for text in options_texts if normalize_text(text))
    raw = f"{normalized_prompt}|{'|'.join(normalized_options)}"
    return hashlib.md5(raw.encode("utf-8")).hexdigest()


def get_question_option_texts(question):
    return [option.text for option in question.options.all()]


def build_existing_fingerprint_set(section):
    existing_qs = section.questions.filter(is_active=True).prefetch_related("options")
    return {
        compute_fingerprint(question.prompt, get_question_option_texts(question))
        for question in existing_qs
    }


def find_duplicate_question(section, prompt, options_texts):
    fingerprint = compute_fingerprint(prompt, options_texts)
    existing_qs = section.questions.filter(is_active=True).prefetch_related("options")

    for question in existing_qs:
        if compute_fingerprint(question.prompt, get_question_option_texts(question)) == fingerprint:
            return question

    return None
