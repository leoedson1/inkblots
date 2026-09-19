/* Inkweave snippet catalogue.
   Used by the in-app Ink menu, including hover and keyboard-focus descriptions.

   kind:
     text     insert into the selected node at the cursor;  $0 marks where the caret lands
     globals  append to the story's globals (the node above the first knot)
     stitch   add a stitch to the selected knot
     nodes    create knots on the canvas; @0 @1 @2 in bodies become their final names,
              and links[] wires them up from the selected node
     story    replace the whole document (asks first)
*/

const INK_SNIPPETS = [
  {
    label: 'Basic structure',
    items: [
      { id: 'knot', label: 'Knot', kind: 'nodes', desc: 'A new named section of the story — the basic unit you divert to and from.', nodes: [{ name: 'new_knot', body: '$0\n-> DONE' }] },
      { id: 'stitch', label: 'Stitch', kind: 'stitch', desc: 'A sub-section inside the current knot, for a scene with several beats that still belong together.' },
      { id: 'divert', label: 'Divert', kind: 'text', desc: 'Jump to another knot, stitch, or label — the arrows that connect the whole story.', text: '-> $0knot_name$0' },
      { id: 'gather', label: 'Gather', kind: 'text', desc: 'A point where several choice branches rejoin, so the story continues from one place.', text: '- $0' },
      { id: 'label', label: 'Named gather', kind: 'text', desc: 'A named gather you can divert back to directly, for loops like \'ask again\'.', text: '- ($0label_name$0) ' },
      { id: 'tunnel', label: 'Tunnel and return', kind: 'text', desc: 'Visit another knot and automatically come back to right after where you left.', text: '-> $0knot_name$0 ->' },
      { id: 'thread', label: 'Thread', kind: 'text', desc: 'Pull in a strand of content from elsewhere without leaving where you are, like a spliced-in aside.', text: '<- $0knot_name$0' },
      { id: 'glue', label: 'Glue', kind: 'text', desc: 'Join this line to the next so Ink doesn\'t insert a line break between them.', text: '<>$0' },
      { id: 'tag', label: 'Tag', kind: 'text', desc: 'Attach metadata to a line for your game code to read — Ink itself ignores it.', text: '# $0tag_name$0' },
      { id: 'done', label: 'End of flow (DONE)', kind: 'text', desc: 'Ends the current flow (a thread or tunnel) without ending the whole story.', text: '-> DONE' },
      { id: 'end', label: 'End of story (END)', kind: 'text', desc: 'Ends the story completely — no further choices or content follow.', text: '-> END' },
    ],
  },
  {
    label: 'Choices',
    items: [
      { id: 'choice', label: 'Choice', kind: 'text', desc: 'A choice the player can pick only once; it disappears from the list after being chosen.', text: '* $0Choice text$0' },
      { id: 'sticky', label: 'Sticky choice', kind: 'text', desc: 'A choice that stays available every time this point is reached, even after being picked.', text: '+ $0Choice text$0' },
      { id: 'choice-split', label: 'Choice with separate output', kind: 'text', desc: 'The bracketed part only shows before picking; the rest of the line continues the prose afterward.', text: '* [$0Choice text$0]' },
      { id: 'choice-mixed', label: 'Choice with shared and separate text', kind: 'text', desc: 'Text before the brackets always shows; the bracketed part is choice-only text.', text: '* You say "[$0Hello.$0]" you say.' },
      { id: 'choice-cond', label: 'Conditional choice', kind: 'text', desc: 'A choice that only appears when the condition in braces is true.', text: '* {$0condition$0} Choice text' },
      { id: 'choice-unvisited', label: 'Choice shown only if a knot is unvisited', kind: 'text', desc: 'A choice that hides itself once you\'ve already been to the named knot.', text: '* {not $0knot_name$0} Choice text' },
      { id: 'fallback', label: 'Fallback choice', kind: 'text', desc: 'A choice with no visible text that\'s taken automatically if nothing else was chosen.', text: '* -> $0knot_name$0' },
      {
        id: 'weave', label: 'Weave with a gather', kind: 'text', desc: 'Two choices that each lead somewhere, then rejoin at a shared gather line.',
        text: '* [$0]\n    A first branch.\n* [Second option]\n    A second branch.\n- Both paths meet here.',
      },
      {
        id: 'weave-nested', label: 'Nested weave', kind: 'text', desc: 'A weave inside a weave, for a branch that itself splits again before rejoining.',
        text: '* [$0]\n    ** [Go deeper]\n        The deepest point.\n    ** [Turn back]\n        You reconsider.\n    -- You return to the surface.\n* [Stay put]\n    Nothing happens.\n- The scene ends.',
      },
      {
        id: 'branch2', label: 'Two branches, as new knots', kind: 'nodes', desc: 'Two full knots wired up as choices from here, for branches substantial enough to deserve their own card.',
        nodes: [
          { name: 'first_path', body: 'The first path.\n-> DONE' },
          { name: 'second_path', body: 'The second path.\n-> DONE' },
        ],
        links: [
          { choice: true, label: 'Take the first path', to: 0 },
          { choice: true, label: 'Take the second path', to: 1 },
        ],
      },
    ],
  },
  {
    label: 'Variables',
    items: [
      { id: 'var', label: 'Global variable', kind: 'globals', desc: 'A story-wide variable, declared once and readable or changeable from anywhere.', text: 'VAR $0variable_name$0 = 0' },
      { id: 'const', label: 'Constant', kind: 'globals', desc: 'A named constant value that can\'t change once the story starts.', text: 'CONST $0constant_name$0 = 1' },
      { id: 'temp', label: 'Temporary variable', kind: 'text', desc: 'A variable that only exists within the current knot, reset each time it\'s entered.', text: '~ temp $0variable_name$0 = 0' },
      { id: 'set', label: 'Modify variable', kind: 'text', desc: 'Change a variable\'s value.', text: '~ $0variable_name$0 = 0' },
      { id: 'incr', label: 'Increase variable', kind: 'text', desc: 'Add to a numeric variable\'s current value.', text: '~ $0variable_name$0 += 1' },
      { id: 'print', label: 'Print variable', kind: 'text', desc: 'Show a variable\'s current value inline in the text.', text: '{$0variable_name$0}' },
      { id: 'var-divert', label: 'Variable holding a divert target', kind: 'globals', desc: 'A variable that holds a knot to divert to later, so the destination can change at runtime.', text: 'VAR $0target_name$0 = -> @knot' },
    ],
  },
  {
    label: 'Inline logic',
    items: [
      { id: 'if-inline', label: 'Conditional text', kind: 'text', desc: 'Shows the text only when the condition is true; shows nothing otherwise.', text: '{$0condition$0: shown when true}' },
      { id: 'ifelse-inline', label: 'Conditional text with alternative', kind: 'text', desc: 'Shows one bit of text if the condition is true, another if it\'s false.', text: '{$0condition$0: when true|when false}' },
      { id: 'seq', label: 'Sequence (stops on the last)', kind: 'text', desc: 'Shows each option once, in order, on repeated visits, then keeps showing the last.', text: '{$0The first time$0|then this|and then this}' },
      { id: 'cycle', label: 'Cycle (repeats forever)', kind: 'text', desc: 'Shows each option in order, looping back to the first after the last.', text: '{&$0First$0|then this|and back again}' },
      { id: 'once', label: 'Once only', kind: 'text', desc: 'Shows the text the first time only; shows nothing on later visits.', text: '{!$0Once only$0|then this, then nothing}' },
      { id: 'shuffle', label: 'Shuffle', kind: 'text', desc: 'Shows one of the options at random each time.', text: '{~$0This$0|or this|or this}' },
      { id: 'visit-count', label: 'React to a visit count', kind: 'text', desc: 'Checks how many times a knot has been visited, for reacting to repeat visits.', text: '{$0knot_name$0 > 1: You have been here before.}' },
    ],
  },
  {
    label: 'Multi-line logic',
    items: [
      { id: 'if-block', label: 'If', kind: 'text', desc: 'Shows the block of lines only when the condition is true.', text: '{ $0condition$0:\n    Shown when true.\n}' },
      { id: 'ifelse-block', label: 'If / else', kind: 'text', desc: 'Shows one block of lines if true, a different block if false.', text: '{ $0condition$0:\n    Shown when true.\n- else:\n    Shown when false.\n}' },
      { id: 'cond-block', label: 'Several conditions', kind: 'text', desc: 'Checks several conditions in order and runs the lines under the first one that\'s true.', text: '{\n- $0first_condition$0:\n    The first true one wins.\n- second_condition:\n    Otherwise this.\n- else:\n    And this if none matched.\n}' },
      { id: 'switch-block', label: 'Switch on a value', kind: 'text', desc: 'Compares a value against several cases and runs the lines under whichever one matches.', text: '{ $0variable_name$0:\n- 0:\n    Nothing.\n- 1:\n    One.\n- else:\n    Several.\n}' },
      { id: 'seq-block', label: 'Multi-line sequence', kind: 'text', desc: 'A sequence of whole lines instead of inline options — shows each once, then repeats the last.', text: '{ stopping:\n- $0The first time.$0\n- Then this, from now on.\n}' },
      { id: 'shuffle-block', label: 'Multi-line shuffle', kind: 'text', desc: 'A shuffle of whole lines instead of inline options — picks one at random each visit.', text: '{ shuffle:\n- $0This.$0\n- Or this.\n- Or this.\n}' },
    ],
  },
  {
    label: 'Comments',
    items: [
      { id: 'comment', label: 'Comment', kind: 'text', desc: 'A note for yourself in the script — ignored by the compiler.', text: '// $0note to self$0' },
      { id: 'block-comment', label: 'Block comment', kind: 'text', desc: 'A multi-line note for yourself — ignored by the compiler.', text: '/*\n    $0note to self$0\n*/' },
      { id: 'todo', label: 'TODO', kind: 'text', desc: 'A reminder marker Inky highlights, for something you mean to come back to.', text: 'TODO: $0what needs doing$0' },
    ],
  },
  {
    label: 'List handling',
    items: [
      { id: 'list', label: 'Define a list', kind: 'globals', desc: 'Declares a named set of possible values, Ink\'s answer to an enum.', text: 'LIST $0list_name$0 = first, second, third' },
      { id: 'list-init', label: 'List with a starting value', kind: 'globals', desc: 'Same as a list, but with one value already selected by default (in parentheses).', text: 'LIST $0list_name$0 = (first), second, third' },
      { id: 'list-state', label: 'List used as a state machine', kind: 'globals', desc: 'A list used to model a single changing state, like a mood or a lock\'s condition.', text: 'LIST $0state_name$0 = (asleep), waking, awake, alarmed' },
      { id: 'list-add', label: 'Add an item', kind: 'text', desc: 'Adds an item to a list variable.', text: '~ $0list_name$0 += item_name' },
      { id: 'list-remove', label: 'Remove an item', kind: 'text', desc: 'Removes an item from a list variable.', text: '~ $0list_name$0 -= item_name' },
      { id: 'list-test', label: 'Test for an item', kind: 'text', desc: 'Checks whether a particular item is currently in a list.', text: '{$0list_name$0 ? item_name: it is there}' },
      { id: 'list-count', label: 'Count the items', kind: 'text', desc: 'Counts how many items are currently in a list.', text: '{LIST_COUNT($0list_name$0)}' },
      { id: 'list-loop', label: 'Print every item', kind: 'text', desc: 'Prints the list\'s contents if it has any, or falls back to a message if it\'s empty.', text: '{ $0list_name$0:\n    You are carrying: {list_name}\n- else:\n    Your hands are empty.\n}' },
    ],
  },
  {
    label: 'Useful functions',
    items: [
      {
        id: 'function', label: 'Function', kind: 'nodes', desc: 'A reusable block of logic that returns a value, callable from anywhere in the story.',
        nodes: [{ name: 'my_function', kind: 'function', args: '(x)', body: '~ return x' }],
      },
      { id: 'external', label: 'External function', kind: 'globals', desc: 'Declares a function implemented in your game code rather than in Ink itself.', text: 'EXTERNAL $0function_name$0(x)' },
      { id: 'random', label: 'Random number', kind: 'text', desc: 'Rolls a random whole number in a range, useful for dice and chance.', text: '~ temp roll = RANDOM($01$0, 6)' },
      { id: 'floor', label: 'Round down', kind: 'text', desc: 'Rounds a number down to the nearest whole number.', text: '{FLOOR($0number$0)}' },
      { id: 'seed', label: 'Fix the random seed', kind: 'text', desc: 'Fixes the random number generator to a specific seed, so RANDOM becomes repeatable.', text: '~ SEED_RANDOM($0123$0)' },
      { id: 'read-count', label: 'Read count of a knot', kind: 'text', desc: 'Reads how many times a knot has been visited so far.', text: '{$0knot_name$0}' },
    ],
  },
  {
    label: 'Useful systems',
    items: [
      {
        id: 'sys-hub', label: 'Hub with spokes that return', kind: 'nodes', desc: 'A central knot the player returns to after visiting either spoke, until they choose to leave.',
        nodes: [
          { name: 'hub', body: 'Where do you want to go?\n+ {not @1} [The first place] -> @1\n+ {not @2} [The second place] -> @2\n+ [Leave] -> DONE' },
          { name: 'first_place', body: 'The first place.\n-> @0' },
          { name: 'second_place', body: 'The second place.\n-> @0' },
        ],
        links: [{ label: 'Go to the hub', to: 0 }],
      },
      {
        id: 'sys-conversation', label: 'Conversation with topics', kind: 'nodes', desc: 'A topic list the player can pick from repeatedly, looping back until they leave.',
        nodes: [
          { name: 'conversation', body: '- (topics)\n* [Ask about the weather] -> @1\n* [Ask about the war] -> @2\n+ [Say nothing and leave] -> DONE' },
          { name: 'about_weather', body: '"Rain by evening," she says.\n-> @0.topics' },
          { name: 'about_war', body: 'She does not answer that one.\n-> @0.topics' },
        ],
        links: [{ label: 'Start the conversation', to: 0 }],
      },
      {
        id: 'sys-statcheck', label: 'Stat check with a dice roll', kind: 'nodes', desc: 'Rolls a die against a stat to decide between two outcomes.',
        globals: 'VAR strength = 3',
        nodes: [
          { name: 'attempt', body: '~ temp roll = RANDOM(1, 6)\n{ roll + strength > 6:\n    -> @1\n- else:\n    -> @2\n}' },
          { name: 'succeeded', body: 'The door gives way.\n-> DONE' },
          { name: 'failed', body: 'It does not budge.\n-> DONE' },
        ],
        links: [{ label: 'Try to force the door', to: 0 }],
      },
      {
        id: 'sys-inventory', label: 'Inventory built on a list', kind: 'nodes', desc: 'A list-backed inventory you can print, check, and use items from.',
        globals: 'LIST inventory = (lamp), rope, coin',
        nodes: [
          { name: 'check_inventory', body: '{ inventory:\n    You are carrying: {inventory}\n- else:\n    You are carrying nothing.\n}\n* {inventory ? rope} [Use the rope]\n    You tie it off.\n    ~ inventory -= rope\n- -> DONE' },
        ],
        links: [{ label: 'Check your pockets', to: 0 }],
      },
      {
        id: 'sys-scene-once', label: 'Scene that only plays once', kind: 'text', desc: 'Wraps a knot so it only plays through the first time it\'s reached.',
        text: '{ not $0:\n    -> $0\n}',
      },
    ],
  },
  {
    label: 'Full stories',
    items: [
      {
        id: 'story-minimal', label: 'Minimal story', kind: 'story', desc: 'A short two-ending example: a door, a choice, and two endings.',
        text: `A door, and a decision.
-> the_door

=== the_door ===
It is not locked, which is somehow worse.
+ [Open it] -> inside
+ [Walk away] -> away

=== inside ===
Inside, the room is exactly as you left it.
-> END

=== away ===
You walk away. The door stays shut.
-> END
`,
      },
      {
        id: 'story-weave', label: 'Story with a weave and variables', kind: 'story', desc: 'A longer example showing a weave, a running variable, and a branching outcome.',
        text: `VAR suspicion = 0

The inspector sets down her cup.
-> interview

=== interview ===
"Walk me through the evening again."
* [Tell the truth]
    ~ suspicion -= 1
    You tell her about the window.
* [Lie]
    ~ suspicion += 2
    You say you were asleep by ten.
* [Say nothing]
    The silence does the talking.
    ~ suspicion += 1
- She writes something down.
{ suspicion > 1:
    -> detained
- else:
    -> released
}

=== detained ===
"I'd like you to stay a while," she says.
-> END

=== released ===
"Thank you for your time."
-> END
`,
      },
      {
        id: 'story-hub', label: 'Hub-and-spoke story', kind: 'story', desc: 'A hub-and-spoke example: a room with three doors and a variable that tracks progress.',
        text: `VAR clues = 0

The house has three rooms and one afternoon in it.
-> hall

=== hall ===
- (options)
The hall, and three doors.
+ {not study} [The study] -> study
+ {not kitchen} [The kitchen] -> kitchen
+ {not cellar} [The cellar] -> cellar
+ {clues > 1} [Leave, knowing enough] -> ending

=== study ===
~ clues += 1
A ledger, open at a page someone tore out.
-> hall.options

=== kitchen ===
~ clues += 1
Two cups. One still warm.
-> hall.options

=== cellar ===
Dark, and empty, and that is the surprise.
-> hall.options

=== ending ===
You leave with {clues} things you did not arrive with.
-> END
`,
      },
    ],
  },
];

if (typeof module !== 'undefined' && module.exports) module.exports = INK_SNIPPETS;
if (typeof window !== 'undefined') window.INK_SNIPPETS = INK_SNIPPETS;
