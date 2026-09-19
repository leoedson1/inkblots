VAR lamp_lit = false
VAR trust = 0

The keeper's log ends mid-sentence. The lamp is dark.
-> arrival

=== arrival ===
Salt wind, a door off its latch, and eighty-two steps going up.
+ [Climb to the lamp room] -> lamp_room
+ [Read the log first] -> the_log
+ {trust > 0} [Call out for the keeper] -> call_out

=== the_log ===
~ trust = trust + 1
Neat handwriting for nine years, then three pages of the same word.
- (again) What word, you decide later, is not the useful question.
+ [Climb] -> lamp_room
+ [Keep reading] -> again

=== call_out ===
Nothing answers but the stairwell, which answers everything.
-> arrival

=== lamp_room ===
The lens is intact. The oil is full. Someone simply stopped.
+ [Light it] -> light_it
+ [Go back down] -> arrival

= aftermath
{lamp_lit:
    Ships will see you for nineteen miles.
  - else:
    The dark keeps its appointment.
}
-> END

=== light_it ===
~ lamp_lit = true
The wick catches on the second match.
-> lamp_room.aftermath
