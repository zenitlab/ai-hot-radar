import { describe, expect, it } from 'vitest';
import { buildTranslateMessages, parseTranslations, translationNeeds, type TranslateItem } from '../utils/translate.js';
import { isChineseText } from '../utils/writing-rules.js';

const item = (over: Partial<TranslateItem> = {}): TranslateItem => ({
  id: 'a',
  title: 'Managed NVIDIA Dynamo on Amazon SageMaker HyperPod Inference',
  titleZh: null,
  summary: 'AWS now offers managed NVIDIA Dynamo on SageMaker HyperPod for inference workloads.',
  content: 'AWS now offers managed NVIDIA Dynamo on SageMaker HyperPod for inference workloads, cutting setup time.',
  source: 'rss_aws_ml',
  authorName: 'AWS Machine Learning Blog',
  ...over,
});

describe('isChineseText', () => {
  it('counts a Chinese title full of product names as Chinese', () => {
    expect(isChineseText('OpenAI 发布 GPT-6.2 Astra 和 GPT-6.2 Sol 模型')).toBe(true);
  });
  it('treats English, empty and near-empty text as not Chinese', () => {
    expect(isChineseText('GPT-6.2 Astra and Sol')).toBe(false);
    expect(isChineseText('')).toBe(false);
    expect(isChineseText(null)).toBe(false);
    expect(isChineseText('A very long English sentence with 中文 in it somewhere')).toBe(false);
  });
});

describe('translationNeeds', () => {
  it('flags an English title without titleZh and an English summary', () => {
    expect(translationNeeds(item())).toEqual({ title: true, summary: true });
  });
  it('leaves Chinese fields and existing titleZh alone', () => {
    expect(translationNeeds(item({ titleZh: '亚马逊 SageMaker 推出托管版 NVIDIA Dynamo', summary: '亚马逊在 SageMaker 上推出托管版 NVIDIA Dynamo。' }))).toEqual({ title: false, summary: false });
    expect(translationNeeds(item({ summary: null }))).toEqual({ title: true, summary: false });
  });
});

describe('buildTranslateMessages', () => {
  it('lists only the fields each item needs', () => {
    const [, user] = buildTranslateMessages([item({ summary: '亚马逊在 SageMaker 上推出托管版 NVIDIA Dynamo，用于推理。' })]);
    expect(user.content).toContain('需要：titleZh');
    expect(user.content).not.toContain('需要：titleZh、summary');
  });
});

describe('parseTranslations', () => {
  const items = [item(), item({ id: 'b', title: 'OpenAI ships GPT-6.2 Astra', summary: 'OpenAI released GPT-6.2 Astra today.', content: 'OpenAI released GPT-6.2 Astra today.' })];

  it('keeps translations that pass the guards', () => {
    const out = parseTranslations(
      JSON.stringify([{ i: 1, titleZh: '亚马逊 SageMaker HyperPod 推出托管版 NVIDIA Dynamo 推理服务', summary: 'AWS 在 SageMaker HyperPod 上推出托管版 NVIDIA Dynamo，用于推理任务。' }]),
      items,
    );
    expect(out.get('a')).toEqual({
      titleZh: '亚马逊 SageMaker HyperPod 推出托管版 NVIDIA Dynamo 推理服务',
      summary: 'AWS 在 SageMaker HyperPod 上推出托管版 NVIDIA Dynamo，用于推理任务。',
    });
  });

  it('drops a translation that names something the source does not, and English passed off as a translation', () => {
    const out = parseTranslations(
      JSON.stringify([
        { i: 1, titleZh: 'Google 推出托管版 NVIDIA Dynamo', summary: 'Still English here.' },
        { i: 2, titleZh: 'OpenAI 发布 GPT-6.2 Astra', summary: 'OpenAI 今天发布了 GPT-6.2 Astra。' },
      ]),
      items,
    );
    expect(out.has('a')).toBe(false);
    expect(out.get('b')).toEqual({ titleZh: 'OpenAI 发布 GPT-6.2 Astra', summary: 'OpenAI 今天发布了 GPT-6.2 Astra。' });
  });

  it('survives junk output', () => {
    expect(parseTranslations('抱歉', items).size).toBe(0);
    expect(parseTranslations('[{"i": 9, "titleZh": "x"}]', items).size).toBe(0);
  });
});
