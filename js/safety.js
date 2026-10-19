// Text safety for the online game: one way of folding Persian spellings, and a small list of
// insults used to refuse names/chat and to hide what other phones send.
// (Moderation is a first line only: players can also report and block.)

// Persian is typed in many spellings, so text is folded to one form before comparing:
// Arabic ي/ك, hamza/alef forms, diacritics, half-spaces, spaces, digits and punctuation.
function nbNorm(s){
  return String(s == null ? '' : s).toLowerCase()
    .replace(/[ً-ٰٟـ]/g, '')
    .replace(/[يى]/g, 'ی').replace(/ك/g, 'ک').replace(/[ةۀ]/g, 'ه')
    .replace(/[آأإٱ]/g, 'ا').replace(/ؤ/g, 'و').replace(/ئ/g, 'ی')
    .replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 0x660)).replace(/[۰-۹]/g, d => String(d.charCodeAt(0) - 0x6F0))
    .replace(/[^\p{L}\p{N}]+/gu, '');
}
function nbParts(s){
  return String(s == null ? '' : s).split(/[\s‌.,،؛;:!?؟()«»"'\-–—_/\\]+/).map(nbNorm).filter(Boolean);
}

const NBSafety = (() => {
  // whole words (a short word like «کس» is also a normal word, so only the clear ones are listed)
  const WORDS = new Set(['کیر', 'کص', 'کون', 'کونی', 'کیری', 'جنده', 'قحبه', 'گوه', 'دیوث', 'حرومزاده', 'حرامزاده',
    'مادرجنده', 'مادرقحبه', 'پدرسگ', 'کسکش', 'کصکش', 'کسخل', 'fuck', 'shit', 'bitch', 'cunt', 'asshole', 'nigger', 'nigga']);
  // fragments that are never innocent, found inside longer words too
  const STEMS = ['کیرم', 'کیرت', 'کیرش', 'کیری', 'کونت', 'کونم', 'کونده', 'کسکش', 'کصکش', 'جنده', 'قحبه', 'گاییدم', 'گاییدن', 'گاییدی', 'کسمادر', 'کسننه', 'مادرجنده', 'مادرقحبه', 'fuck'];
  function bad(text){
    const t = String(text == null ? '' : text);
    if(WORDS.has(nbNorm(t))) return true;
    if(nbParts(t).some(p => WORDS.has(p))) return true;
    const n = nbNorm(t);
    return STEMS.some(s => n.includes(s));
  }
  return {
    bad,
    // what to show for text that came from another phone
    clean(text){ return bad(text) ? '•••' : String(text == null ? '' : text); },
  };
})();
