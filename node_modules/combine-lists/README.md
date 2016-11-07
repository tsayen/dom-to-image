This tool merges two lists, removing duplicates, and doing everything possible
to maintain the order of the two lists.

This tool guarantees that the order of the first list is preserved (that is, if
x comes before y in the first list, x comes before y in the returned list) and
tries not to undo the order of the second list, though sometimes it is
unavoidable.

For example, if we have `list1 = [1, 2, 4]` and `list2 = [2, 1, 3, 4]`, then the
merged list would be `[1, 2, 3, 4]`, since that preserves the order of `list1`
while doing the best job possible of preserving the order of `list2`.

A case like `list1 = [1, 3]`, `list2 = [3, 2, 1]` is more complicated.  It's not
clear what the best merged list is, but it's probably either `[2, 1, 3]` or
`[1, 3, 2]`.

In general, it's not totally clear what the "best" merged list is, but there are
some basic properties that anyone would expect:

- Since the order of list1 is preserved, the merged list will look like the
  first list with the elements exclusive to the second inserted in betweeen
- If `list2[i]` is not in `list1`, and it is possible to insert `list2[i]` into
  `list1` without contradicting the order of `list2`, then it should be inserted
  in such a way

This tool is very slow, crossing the 100ms mark with lists around 150 in length,
and growing at a rate of
`O(list2.length*list2.length*(list1.length + list2.length))` from there.


Installation / Usage
--------------------

Install with

```
npm install combine-lists
```

Use like so:

```js
var combineLists = require('combine-lists');
combineLists([1, 2], [2, 3]); // [1, 2, 3]
```
