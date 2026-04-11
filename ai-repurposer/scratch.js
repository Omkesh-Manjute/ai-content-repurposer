const raw = `
**NOTES** Here are notes
**CAPTIONS**
1. cc
**REEL SCRIPT**
hook
**HIGHLIGHTS**
clip
`;

const notesMatch = raw.match(/(?:^|\n)[#*\s]*NOTES?[*#\s:]*\s*([\s\S]*?)(?=(?:^|\n)[#*\s]*(?:CAPTIONS?|REEL\s*SCRIPT|HIGHLIGHTS?)[*#\s:]*|$)/i);
const captionsMatch = raw.match(/(?:^|\n)[#*\s]*CAPTIONS?[*#\s:]*\s*([\s\S]*?)(?=(?:^|\n)[#*\s]*(?:NOTES?|REEL\s*SCRIPT|HIGHLIGHTS?)[*#\s:]*|$)/i);
const reelMatch = raw.match(/(?:^|\n)[#*\s]*REEL\s*SCRIPT[*#\s:]*\s*([\s\S]*?)(?=(?:^|\n)[#*\s]*(?:NOTES?|CAPTIONS?|HIGHLIGHTS?)[*#\s:]*|$)/i);
const highlightsMatch = raw.match(/(?:^|\n)[#*\s]*HIGHLIGHTS?[*#\s:]*\s*([\s\S]*?)(?=(?:^|\n)[#*\s]*(?:NOTES?|CAPTIONS?|REEL\s*SCRIPT)[*#\s:]*|$)/i);

console.log("NOTES:", notesMatch ? notesMatch[1] : null);
console.log("CAPTIONS:", captionsMatch ? captionsMatch[1] : null);
console.log("REEL:", reelMatch ? reelMatch[1] : null);
console.log("HIGHLIGHTS:", highlightsMatch ? highlightsMatch[1] : null);
