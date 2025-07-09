// Restoring your main orchestrator JavaScript code (with conversation styles support)
import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';
import _ from 'lodash';

const openai = new OpenAI();
const configPath = './voiceConfig.json';
const narratorProfilesPath = './narratorProfiles.json';
const conversationStylesPath = './conversationStyles.json';

const randInRange = (min, max) => +(Math.random() * (max - min) + min).toFixed(2);
const parseStory = (text) => text.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);

function loadJSON(path) {
  return JSON.parse(fs.readFileSync(path, 'utf8'));
}
function saveJSON(path, data) {
  fs.writeFileSync(path, JSON.stringify(data, null, 2));
}

function applyWeightedDefaults(character, emotion, config) {
  let style = _.cloneDeep(config.globalDefaults);
  for (const weight of config.weightedDefaults) {
    const charPattern = weight.match.characterPattern ? new RegExp(weight.match.characterPattern, 'i') : null;
    const emoMatch = weight.match.emotion === emotion;
    if ((charPattern && charPattern.test(character)) || emoMatch) {
      for (const [path, value] of Object.entries(weight.apply)) {
        _.set(style, path, value);
      }
    }
  }
  return style;
}

function overlayCharacterEmotion(style, character, emotion, config) {
  if (config.characters[character]) {
    const charCfg = config.characters[character][emotion] || config.characters[character]['default'];
    if (charCfg) _.merge(style, charCfg);
  }
  return style;
}

function overlayConversationStyle(style, conversationType, conversationStyles) {
  const overlay = conversationStyles[conversationType];
  if (overlay) _.merge(style, overlay);
  return style;
}

function mergeNarratorWithStyle(narratorBaseline, style) {
  return {
    stability: (narratorBaseline.stability + style.stability.mean) / 2,
    similarityBoost: (narratorBaseline.similarity_boost + style.similarity_boost.mean) / 2,
    style: (narratorBaseline.style + style.style.mean) / 2,
    prosody: {
      pitch: `${parseInt(narratorBaseline.pitch) + parseInt(style.prosody.pitch.base) + randInRange(style.prosody.pitch.range[0], style.prosody.pitch.range[1])}%`,
      rate: `${parseInt(narratorBaseline.rate) + parseInt(style.prosody.rate.base) + randInRange(style.prosody.rate.range[0], style.prosody.rate.range[1])}%`,
      volume: narratorBaseline.volume || style.prosody.volume
    }
  };
}

function ensureVoiceProfile(config, character, emotion) {
  if (!config.characters[character]) config.characters[character] = {};
  if (!config.characters[character][emotion]) {
    config.characters[character][emotion] = {
      stability: randInRange(0.6, 0.9),
      similarity_boost: randInRange(0.8, 0.95),
      style: randInRange(0.3, 0.7),
      prosody: {
        pitch: `${randInRange(-5,5)}%`,
        rate: `${randInRange(80,100)}%`,
        volume: "medium"
      }
    };
    console.log(`🆕 Added new profile: ${character} -> ${emotion}`);
  }
}

async function detectContext(segment) {
  const prompt = `Given this text:\n\n"${segment}"\n\nReturn JSON like {"character":"Narrator", "emotion":"neutral"}`;
  const response = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [{ role: "user", content: prompt }]
  });
  try {
    return JSON.parse(response.choices[0].message.content.trim());
  } catch {
    console.error("Failed to parse GPT output, defaulting to Narrator.");
    return { character: "Narrator", emotion: "neutral" };
  }
}

function buildSSML(text, prosody) {
  return `<speak><prosody pitch='${prosody.pitch}' rate='${prosody.rate}' volume='${prosody.volume}'>${text}</prosody></speak>`;
}

async function processStoryForConversationStyle(filePath, narratorName, conversationType) {
  const config = loadJSON(configPath);
  const narratorProfiles = loadJSON(narratorProfilesPath);
  const conversationStyles = loadJSON(conversationStylesPath);
  const narrator = narratorProfiles[narratorName];

  if (!narrator) throw new Error(`Narrator profile ${narratorName} not found.`);
  const story = fs.readFileSync(filePath, 'utf8');
  const segments = parseStory(story);

  const enrichedSegments = [];
  for (const seg of segments) {
    const ctx = await detectContext(seg);
    ensureVoiceProfile(config, ctx.character, ctx.emotion);

    let style = applyWeightedDefaults(ctx.character, ctx.emotion, config);
    style = overlayCharacterEmotion(style, ctx.character, ctx.emotion, config);
    style = overlayConversationStyle(style, conversationType, conversationStyles);
    const resolved = mergeNarratorWithStyle(narrator.baselineVoice, style);

    const ssml = buildSSML(seg, resolved.prosody);
    enrichedSegments.push({
      text: seg,
      ...ctx,
      ssml,
      voiceSettings: {
        stability: resolved.stability,
        similarityBoost: resolved.similarityBoost,
        style: resolved.style
      },
      voiceId: narrator.voice_id
    });
  }

  saveJSON(configPath, config);
  saveJSON(`./output_${conversationType}_${narratorName}_${path.basename(filePath, '.txt')}.json`, enrichedSegments);
  console.log(`✅ Saved for ${conversationType} conversation with ${narratorName}.`);
}

// Usage example
// processStoryForConversationStyle('./articles/my_article.txt', 'FatherJohn', 'respectful');
