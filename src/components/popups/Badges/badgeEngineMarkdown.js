import { BADGE_CHEAP_AVOID, BADGE_CHEAP_NOTES, BADGE_CHEAP_PREFER } from './badgeHelpSections';

function decodeHelpEntities(value) {
  return String(value ?? '')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&nbsp;/gi, ' ');
}

export function helpTextToMarkdown(value) {
  return decodeHelpEntities(
    String(value ?? '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(?:b|strong)>/gi, '**')
      .replace(/<(?:b|strong)>/gi, '**')
      .replace(/<code>([\s\S]*?)<\/code>/gi, (_, inner) => `\`${decodeHelpEntities(inner)}\``)
      .replace(/<[^>]+>/g, ''),
  ).replace(/[ \t]+\n/g, '\n').trim();
}

function pushBlock(lines, text) {
  if (!text) return;
  lines.push(text, '');
}

export function buildBadgeEngineMarkdown(t, sections) {
  const lines = [];
  pushBlock(lines, `# ${t('badges.help.title')}`);
  pushBlock(lines, helpTextToMarkdown(t('badges.help.agentBrief.intro')));
  pushBlock(lines, `## ${t('badges.help.agentBrief.requestedTitle')}`);
  pushBlock(lines, helpTextToMarkdown(t('badges.help.agentBrief.requestedPlaceholder')));
  pushBlock(lines, `## ${t('badges.help.agentBrief.outputTitle')}`);
  pushBlock(lines, helpTextToMarkdown(t('badges.help.agentBrief.output')));
  pushBlock(lines, `## ${t('badges.help.agentBrief.rulesTitle')}`);
  pushBlock(lines, helpTextToMarkdown(t('badges.help.agentBrief.rules')));
  pushBlock(lines, `## ${t('badges.help.agentBrief.cheapTitle')}`);
  pushBlock(lines, helpTextToMarkdown(t('badges.help.agentBrief.cheapIntro')));
  pushBlock(lines, `**${t('badges.help.agentBrief.cheapPreferTitle')}**`);
  for (const key of BADGE_CHEAP_PREFER) {
    lines.push(`- ${helpTextToMarkdown(t(key))}`);
  }
  lines.push('');
  pushBlock(lines, `**${t('badges.help.agentBrief.cheapAvoidTitle')}**`);
  for (const key of BADGE_CHEAP_AVOID) {
    lines.push(`- ${helpTextToMarkdown(t(key))}`);
  }
  lines.push('');
  pushBlock(lines, `**${t('badges.help.agentBrief.cheapNotesTitle')}**`);
  for (const key of BADGE_CHEAP_NOTES) {
    lines.push(`- ${helpTextToMarkdown(t(key))}`);
  }
  lines.push('');
  pushBlock(lines, `## ${t('badges.help.subtitle')}`);

  for (const section of sections) {
    if (section.id === 'cheap') continue;
    pushBlock(lines, `### ${t(section.titleKey)}`);
    if (section.introKey) pushBlock(lines, helpTextToMarkdown(t(section.introKey)));
    if (section.htmlKey) pushBlock(lines, helpTextToMarkdown(t(section.htmlKey)));

    if (section.fields?.length) {
      for (const field of section.fields) {
        lines.push(`- \`${field.token}\` — **${t(field.titleKey)}**: ${helpTextToMarkdown(t(field.descKey))}`);
        if (field.exampleKey) {
          lines.push(`  - ${helpTextToMarkdown(t(field.exampleKey))}`);
        }
      }
      lines.push('');
    }

    if (section.examples?.length) {
      pushBlock(lines, `**${t('badges.help.examplesTitle')}**`);
      for (const key of section.examples) {
        lines.push(`- ${helpTextToMarkdown(t(key))}`);
      }
      lines.push('');
    }

    if (section.bullets?.length) {
      for (const key of section.bullets) {
        lines.push(`- ${helpTextToMarkdown(t(key))}`);
      }
      lines.push('');
    }
  }

  return `${lines.join('\n').replace(/\n{3,}/g, '\n\n').trim()}\n`;
}
