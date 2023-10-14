use reqwest::blocking::Client;
use serde_json::{json, Value};
use std::{collections::HashMap, error::Error};

#[no_mangle]
pub fn translate(
    text: &str,                     // Text to be translated
    from: &str,                     // Source Language
    to: &str,                       // Target Language
    detect: &str,                   // Detected Language
    needs: HashMap<String, String>, // Other arguments defined in info.json
) -> Result<Value, Box<dyn Error>> {
    let client = reqwest::blocking::ClientBuilder::new().build()?;
    let res: Value = client
        .get(format!(
            "https://api.dictionaryapi.dev/api/v2/entries/{to}/{text}"
        ))
        .send()?
        .json()?;

    fn parse_result(res: Value, client: Client) -> Option<Value> {
        let body = res.as_array()?.get(0)?.as_object()?;
        let (phonetics, meanings) = (body.get("phonetics")?, body.get("meanings")?);

        let (mut pronunciations, mut explanations, mut associations, mut sentence) =
            (Vec::new(), Vec::new(), Vec::new(), Vec::new());

        for item in phonetics.as_array()? {
            let audio_url = item.get("audio")?.as_str()?;
            if audio_url.is_empty() {
                break;
            }

            let region = audio_url.get((audio_url.len() - 6)..(audio_url.len() - 4))?;
            let symbol = match item.get("text") {
                Some(_) => item.get("text")?.as_str()?,
                None => "",
            };

            let voice = client.get(audio_url).send().ok()?.bytes().ok()?.to_vec();
            pronunciations.push(json!({
            "region": region,
            "symbol": symbol,
            "voice": voice,
            }));
        }

        for item in meanings.as_array()? {
            let _trait = item.get("partOfSpeech")?.as_str()?;
            let mut explains = Vec::new();
            let definitions = item.get("definitions")?.as_array()?;

            for definition in definitions {
                explains.push(definition.get("definition")?.as_str()?);

                if let Some(example) = definition.get("example") {
                    sentence.push(json!({
                    "source": example.as_str()?,
                    "target": "",
                    }));
                };
            }

            explanations.push(json!({
            "trait": _trait,
            "explains": explains,
            }));

            let synonyms = item
                .get("synonyms")?
                .as_array()?
                .into_iter()
                .map(|x| x.as_str().unwrap())
                .collect::<Vec<_>>();

            associations.extend(synonyms);
        }

        Some(json!({
            "pronunciations": pronunciations,
            "explanations": explanations,
            "associations": associations,
            "sentence": sentence,
        }))
    }

    if let Some(result) = parse_result(res, client) {
        return Ok(result);
    } else {
        return Err("Response Parse Error".into());
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn try_request() {
        let mut needs = HashMap::new();
        let result = translate("hello", "en", "en", "en", needs).unwrap();
        println!("{result}");
    }
}
