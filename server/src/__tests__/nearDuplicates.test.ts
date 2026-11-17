import { describe, it, expect } from 'vitest';
import { findNearDuplicates } from '../utils/title-cluster.js';

describe('findNearDuplicates', () => {
  it('folds a near-copy of an earlier headline under the earliest one', () => {
    const dup = findNearDuplicates([
      { id: 'a', title: 'OpenAI 联手四家机构启动嵌入式安全评估' },
      { id: 'b', title: 'OpenAI 联手四家机构启动嵌入式安全评估！' },
      { id: 'c', title: 'openai 联手四家机构启动嵌入式安全评估' },
      { id: 'd', title: 'Neel Nanda 批评 OpenAI 嵌入式评估未达员工级访问承诺' },
    ]);
    expect(dup.get('b')).toBe('a');
    expect(dup.get('c')).toBe('a');
    expect(dup.has('a')).toBe(false);
    expect(dup.has('d')).toBe(false);
  });

  it('never folds short headlines unless they are identical', () => {
    const dup = findNearDuplicates([
      { id: 'a', title: 'GPT-6 发布' },
      { id: 'b', title: 'GPT-6 上线' },
      { id: 'c', title: 'GPT-6 发布' },
    ]);
    expect(dup.has('b')).toBe(false);
    expect(dup.get('c')).toBe('a');
  });

  it('never folds a first-party report, even under an earlier repost', () => {
    const dup = findNearDuplicates([
      { id: 'hn', title: 'OpenAI 发布 GPT-5.7，推理速度提升 40%' },
      { id: 'blog', title: 'OpenAI 发布 GPT-5.7，推理速度提升 40%', keep: true },
      { id: 'media', title: 'OpenAI 发布 GPT-5.7，推理速度提升 40%' },
    ]);
    expect(dup.has('blog')).toBe(false);
    expect(dup.get('media')).toBe('hn');
  });
});
