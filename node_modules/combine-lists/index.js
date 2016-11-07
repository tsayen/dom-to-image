var _ = require('lodash');

/** Merge two lists, removing duplicates, and doing everything possible to
 *  maintain the order of the two lists.
 *
 *  This function guarantees that the order of list1 is preserved (that is, if x
 *  comes before y in list1, x comes before y in the returned list) and tries
 *  not to undo the order of list2, though sometimes it is unavoidable.
 *
 *  For example, if we have list1 = [1, 2, 4] and list2 = [2, 1, 3, 4], then the
 *  merged list would be [1, 2, 3, 4], since that preserves the order of list1
 *  while doing the best job possible of preserving the order of list2.
 *
 *  A case like list1 = [1, 3], list2 = [3, 2, 1] is more complicated.  It's not
 *  clear what the best merged list is, but it's probably either [2, 1, 3] or
 *  [1, 3, 2].
 *
 *  In general, it's not totally clear what the "best" merged list is, but there
 *  are some basic properties that anyone would expect:
 *    - Since the order of list1 is preserved, the merged list will look like
 *      list1 with the elements exclusive to list2 inserted in betweeen
 *    - If list2[i] is not in list1, and it is possible to insert list2[i] into
 *      list1 without contradicting the order of list2, then it should be
 *      inserted in such a way
 *
 *  This is very slow, crossing the 100ms mark with lists around 150 in length,
 *  and growing at a rate of
 *  O(list2.length*list2.length*(list1.length + list2.length)) from there.
 *
 *  @param {Array<*>} list1
 *  @param {Array<*>} list2
 *  @return {Array<*>} A list containing all the elements of list1 and list2,
 *      with duplicates removed, the order of list1 preserved, and the order of
 *      list2 partially preserved
 */
module.exports = function(list1, list2) {
  /* This is going to get mathematical.  As noted above, the merged list will be
   * a copy of list1 with the items exclusive to list2 inserted in between.  But
   * additionally, we want to preserve the order of list2 as much as possible.
   * In more formal terms, for all x and y from list2, we want to minimize the
   * number of times that x is before y in the merged list but after y in list2.
   * We call each such time an "inversion", after the term in discrete math.
   *
   * We are going to take a greedy approach to this:
   *
   * merged_list = a copy of list1
   * for(i = 0; i < list2.length; i++)
   *   if(list2[i] is not in list1)
   *     insert list2[i] into merged_list in the earliest place that creates the
   *     minimum number of inversions
   * return merged_list
   *
   * It can be proven that this gives you the two properties mentioned in the
   * header comment above
   */
  var merged = list1.slice(); // The merged list to return
  var mergedIndexes = _.invert(merged);
  for (var i = 0; i < list2.length; i++) {
    var elem = list2[i];
    if (mergedIndexes[elem] === undefined) {
      // Count the inversions for every possible insertion position
      var inversionCnts = typeof Int32Array !== 'undefined' ?
          new Int32Array(merged.length + 1) :
          _.fill(new Array(merged.length + 1), 0);
      for (var j = 0; j < list2.length; j++) {
        var jMergedIndex = mergedIndexes[list2[j]];
        if (j < i) {
          for (var k = 0; k <= jMergedIndex; k++) {
            inversionCnts[k]++;
          }
        } else if (jMergedIndex !== undefined) { // j > i
          for (var k = jMergedIndex + 1; k < inversionCnts.length; k++) {
            inversionCnts[k]++;
          }
        }
      }

      // Pick the earliest place that creates the minimum number of inversions
      var minInversionIndex = 0;
      for (var j = 1; j < inversionCnts.length; j++) {
        if (inversionCnts[j] < inversionCnts[minInversionIndex]) {
          minInversionIndex = j;
        }
      }
      merged.splice(minInversionIndex, 0, elem);
      mergedIndexes = _.invert(merged);
    }
  }
  return merged;
};
