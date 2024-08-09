// SPDX-FileCopyrightText: 2024 Integral <integral@member.fsf.org>
//
// SPDX-License-Identifier: GPL-3.0-or-later

async function translate(text, from, to, detect, needs = {}) {
  try {
    const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/${to}/${text}`);
    const data = await response.json();
    return formatDictionaryEntries(data);
  } catch (error) {
    throw new Error("Response Parse Error");
  }
}

function formatDictionaryEntries(entries) {
  if (!Array.isArray(entries) || entries.length === 0) {
    return "No entries found.";
  }

  let result = `${entries[0].word}\n\n`;
  let pronunciations = new Set();
  let meanings = [];

  entries.forEach(entry => {
    // Collect unique pronunciations
    if (entry.phonetics) {
      entry.phonetics.forEach(phonetic => {
        let pronunciationInfo = "";
        if (phonetic.text) {
          pronunciationInfo += phonetic.text;
        }
        if (phonetic.audio && phonetic.text) {
          const region = getRegionFromAudioUrl(phonetic.audio, entry.word);
          if (region) {
            pronunciationInfo += ` (${region})`;
          }
        }
        if (pronunciationInfo) {
          pronunciations.add(pronunciationInfo);
        }
      });
    }

    // Collect all meanings
    if (entry.meanings) {
      meanings = meanings.concat(entry.meanings);
    }
  });

  // Add pronunciations to result
  if (pronunciations.size > 0) {
    result += "Pronunciations:\n";
    pronunciations.forEach(pronunciation => {
      result += `   ${pronunciation}\n`;
    });
    result += "\n";
  }

  // Add meanings to result
  if (meanings.length > 0) {
    let partOfSpeechCounter = {};
    meanings.forEach((meaning, index) => {
      const partOfSpeech = meaning.partOfSpeech.charAt(0).toUpperCase() + meaning.partOfSpeech.slice(1);
      partOfSpeechCounter[partOfSpeech] = (partOfSpeechCounter[partOfSpeech] || 0) + 1;
      result += `${partOfSpeechCounter[partOfSpeech]}. ${partOfSpeech}\n`;
      
      meaning.definitions.forEach((def, defIndex) => {
        result += `   ${defIndex + 1}. ${def.definition}\n`;
        if (def.example) {
          result += `      Example: "${def.example}"\n`;
        }
      });

      if (meaning.synonyms && meaning.synonyms.length > 0) {
        result += `   Synonyms: ${meaning.synonyms.join(", ")}\n`;
      }

      if (meaning.antonyms && meaning.antonyms.length > 0) {
        result += `   Antonyms: ${meaning.antonyms.join(", ")}\n`;
      }

      result += "\n";
    });
  }

  return result.trim();
}

function getRegionFromAudioUrl(url, word) {
  const regionCodes = {
    'us': 'American',
    'uk': 'British',
    'au': 'Australian',
    'ca': 'Canadian',
    'ie': 'Irish',
    'nz': 'New Zealand',
    'sa': 'South African',
    'in': 'Indian',
    'jm': 'Jamaican',
    'ph': 'Philippine',
    'sg': 'Singaporean',
    'ng': 'Nigerian',
    'gh': 'Ghanaian',
    'ke': 'Kenyan',
    'tz': 'Tanzanian',
    'zw': 'Zimbabwean',
    'hk': 'Hong Kong',
    'my': 'Malaysian'
  };

  const pattern = new RegExp(`${word}-\\d*-?([a-z]{2})\\.mp3`);
  const match = url.match(pattern);

  if (match && match[1] in regionCodes) {
    return regionCodes[match[1]];
  }

  return null;
}

// Example usage
async function main() {
  try {
    const result = await translate("implement", "en", "en", "en");
    console.log(result);
  } catch (error) {
    console.error("Error:", error.message);
  }
}

main();