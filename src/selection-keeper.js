/**
 * Selection Keeper, a cross-browser JavaScript selection saving and restoring library
 * https://github.com/xoguskim/selection-keeper
 *
 * Copyright %%build:year%%, Taehyun Kim
 * Licensed under the MIT license.
 * Version: %%build:version%%
 * Build date: %%build:date%%
 */

(function(factory, root) {
    // No AMD or CommonJS support so we place Rangy in (probably) the global variable
    root.selectionKeeper = factory();
})(function() {
    var log = log4javascript.getLogger("selectionKeeper.core");


    var api = {
        version: "%%build:version%%",
        initialized: false,
        supported: true,
        util: util,
        features: {},
        config: {
            preferTextRange: false,
            autoInitialize: (typeof rangyAutoInitialize == UNDEFINED) ? true : rangyAutoInitialize
        }
    };


    return api;



    function RangeUtil(doc, container) {
        this.doc = doc;
        this.container = container;
    }

    RangeUtil.prototype.saveSelection = function() {

        //  get current selection text
        var selection = window.getSelection();
        if( selection.rangeCount > 0 ) {
            var selectedRange = selection.getRangeAt(0);
            if( selectedRange ) {
                var clonedRange = selectedRange.cloneRange();

                var blockRange = this.doc.createRange();
                blockRange.selectNodeContents(this.container);

                var blockRange = getBlockSelection(blockRange, clonedRange);
                if( blockRange )
                    this.currentSelection = this.getRangeIndex(blockRange);

                return;
            }
        }

        this.currentSelection = null;
    };


    RangeUtil.prototype.restoreSelection = function() {
        if( !this.currentSelection )
            return;

        //  compare selection texts
        var rangeObj = this.doc.createRange();
        rangeObj.selectNodeContents(this.container);

        var newcon = this.getRangeString(rangeObj);

        var index = _getNewSelectionIndex(this.currentSelection.pre, this.currentSelection.sel, this.currentSelection.next, newcon);

        console.log( "new selection: " + index.s + ", " + index.e );
//        this.selectTextWithIndex(index.s, index.e);
        this.selectText(index.s, index.e);

    };


    function _getNewSelectionIndex(pre, sel, next, newcon) {
        var matchP = false;
        var matchN = false;

        var t = newcon.length;

        var matchingLengthP = _getMetchingLength(pre, newcon, false);
        if( matchingLengthP == pre.length ) {
            matchP = true;
        }
        newcon = newcon.substring(matchingLengthP);

        var matchingLengthN = _getMetchingLength(next, newcon, true);
        if( matchingLengthN == next.length ) {
            matchN = true;
        }
        newcon = newcon.substring(0, newcon.length-matchingLengthN);

        var matchingLengthSS = 0;
        var matchingLengthSE = 0;
        if( matchP ) {
            matchingLengthSS = _getMetchingLength(sel, newcon, false);
        }
        if( matchN ) {
            matchingLengthSE = _getMetchingLength(sel, newcon, true);
        }

        var s = 0;
        var e = 0;
        //  find start index
        if( matchP && matchN ) {
            //  P == P' and N == N'
                //  s = P.length
                //  e = Tot.length - N.length
            if( matchingLengthSS == 0 )
                s = t - (next.length + matchingLengthSE);
            else
                s = pre.length;

            if( matchingLengthSE == 0 )
                e = pre.length + matchingLengthSS;
            else
                e = t - next.length;
        }
        else if ( matchP ) {
            //  P == P'
                //  s = P.length
                //  e = S와 S'의 substring 길이가 일치하는 최대치
            s = pre.length;
            e = s + matchingLengthSS;
        }
        else if ( matchN ) {
            //  N == N'
                //  e = (Tot.length - N.length)
                //  s = S와 S'의 뒤부터 substring 길이가 일치하는 최대치
            s = t - (matchingLengthSE + next.length);
            e = t - next.length;
        }
        else {
            //  else
                //  s = e = (P와 P'이 일치하는 최대치)
            s = e = matchingLengthP;
        }

        if( s > e )
            s = e;
        return {s: s, e: e};
    }

    function _getMetchingLength(s1, s2, reverse)
    {
      var base = s1.split('');
      var comp = s2.split('');
      if( reverse ) {
        base = base.reverse();
        comp = comp.reverse();
      }

      var size = Math.min( base.length, comp.length );
      var result = 0;

      for(result=0; result < size; result++) {
        if( comp[result] != base[result] ) {
          return result;
        }
      }

      return result;
    }

    RangeUtil.prototype.getRangeIndex = function(range) {
        var rangeObj = this.doc.createRange();
        var sel = this.getRangeString(range);

        var startCont = range.startContainer;
        var startOffset = range.startOffset;

        rangeObj.selectNodeContents(this.container);
        rangeObj.setEnd(startCont, startOffset);

        var pre = this.getRangeString(rangeObj);


        var endCont = range.endContainer;
        var endOffset = range.endOffset;

        rangeObj.selectNodeContents(this.container);
        rangeObj.setStart(endCont, endOffset);

        var next = this.getRangeString(rangeObj);

        return {
            pre: pre,
            sel: sel,
            next: next
        };
    };


    RangeUtil.prototype.selectText = function(_from, _to) {
        var selection = window.getSelection();
        var range = this.doc.createRange();

        range.setStart(this.container, 0);
        range.setEnd(this.container, 0);

        selection.removeAllRanges();
        selection.addRange(range);

        for(var i=0; i < _from; i++) {
            selection.modify('move', 'forward', 'character');
        }
        for(; i < _to; i++) {
            selection.modify('extend', 'forward', 'character');
        }
    }

    RangeUtil.prototype.getRangeString = function(range) {
        var selection = window.getSelection();

        var curSelectedRange = selection.getRangeAt(0);
        var clonedRange = curSelectedRange.cloneRange();

        selection.removeAllRanges();
        selection.addRange(range);

        var result = selection.toString();

        selection.removeAllRanges();
        selection.addRange(clonedRange);

        return result;
    }

    function getBlockSelection(rblock, sel) {
        var range = null;

         var ete = rblock.compareBoundaryPoints(Range.END_TO_END, sel);
         var ets = rblock.compareBoundaryPoints(Range.END_TO_START , sel);
         var ste = rblock.compareBoundaryPoints(Range.START_TO_END , sel);
         var sts = rblock.compareBoundaryPoints(Range.START_TO_START , sel);




        if( ete > 0 ) {
            //  블럭의 end가 selection의 e 보다 큰 경우 a, b, c
            if( ets > 0 ) {
                // 블럭의 start가 selection의 e보다 큰 경우 a
                // selection 무시
            }
            else if ( sts > 0 ) {
                //  블럭의 start가 selection의 start보다 큰 경우 b
                range = sel.cloneRange();
                range.setStart( rblock.startContainer, rblock.startOffset );
            }
            else {
                //  블럭의 start가 selection의 start보다 큰 경우 f
                range = sel.cloneRange();
            }
        }
        else {
            //  블럭의 end가 selection의 end보다 작은 경우 d, e, f
            if( ste < 0 ) {
               // 블럭의 start가 selection의 e보다 작은 경우 e
               //  selection 무시
            }
            else if (sts < 0 ) {
                //  블럭의 start가 selection의 start보다 작은 경우 d
                range = sel.cloneRange();
                range.setEnd( rblock.endContainer, rblock.endOffset );
            }
            else {
                //  블럭의 start가 selection의 start보다 큰 경우 f
                range = rblock.cloneRange();
            }
        }

        return range;
    }





    return RangeUtil;
});


