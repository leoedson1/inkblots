const {test} = require('node:test');
const assert = require('node:assert/strict');
const {Compiler} = require('inkjs/full');
const snippet = require('../renderer/snippets').flatMap(g => g.items).find(i => i.id === 'story-inkblots-tour');
for (const helped of [true, false]) for (const shared of [true, false]) {
  test(`Showcase complete route: helped=${helped}, shared=${shared}`, () => {
    const story = new Compiler(snippet.text).Compile();
    let text = '';
    const read = () => { while (story.canContinue) text += story.Continue(); };
    const choose = label => { read(); const i = story.currentChoices.findIndex(c => c.text.includes(label)); assert.notEqual(i, -1, label); story.ChooseChoiceIndex(i); read(); };
    choose(helped ? 'Ask the keeper' : 'Explore on your own');
    choose('Check your collection'); assert.match(text, /pockets are empty/); choose('Return');
    choose('Listen to the clock'); assert.match(text, /return to the hall/);
    choose('Visit the workshop'); choose('Climb to the observatory');
    choose('Check your collection'); assert.match(text, /2 relics/); choose('Return');
    choose('Restore the lantern'); choose(shared ? 'Light it' : 'Keep a little');
    assert.equal(story.currentChoices.length, 0); assert.equal(story.canContinue, false);
    assert.match(text, shared ? /Every window/ : /small star/);
  });
}
test('Showcase permits early departure', () => {
  const story = new Compiler(snippet.text).Compile();
  while(story.canContinue) story.Continue(); story.ChooseChoiceIndex(0);
  while(story.canContinue) story.Continue();
  story.ChooseChoiceIndex(story.currentChoices.findIndex(c => c.text.includes('Leave the archive')));
  let text = ''; while(story.canContinue) text += story.Continue();
  assert.match(text, /0 sparks/); assert.equal(story.currentChoices.length, 0);
});
