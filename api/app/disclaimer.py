DISCLAIMER_EN = (
    "RxLens AI is an educational prescription companion. It does not diagnose, "
    "prescribe, or replace a doctor or pharmacist. Always follow your clinician’s "
    "advice. If you have severe symptoms (difficulty breathing, swelling, severe "
    "allergy), seek emergency care immediately."
)

DISCLAIMER_BN = (
    "RxLens AI একটি শিক্ষামূলক প্রেসক্রিপশন সহায়ক। এটি রোগ নির্ণয় বা ওষুধ নির্ধারণ "
    "করে না এবং ডাক্তার/ফার্মাসিস্টের বিকল্প নয়। সর্বদা আপনার চিকিৎসকের পরামর্শ মেনে চলুন। "
    "শ্বাসকষ্ট, ফোলা বা তীব্র অ্যালার্জি হলে জরুরি চিকিৎসা নিন।"
)


def disclaimer_for(language: str) -> str:
    return DISCLAIMER_BN if language == "bn" else DISCLAIMER_EN
