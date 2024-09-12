import _toConsumableArray from "@babel/runtime/helpers/esm/toConsumableArray";
import _slicedToArray from "@babel/runtime/helpers/esm/slicedToArray";
import { useEvent } from 'rc-util';
import * as React from 'react';
import { UnstableContext } from "../context";
/** Drag to delete offset. It's a user experience number for dragging out */
var REMOVE_DIST = 130;
function getPosition(e) {
  var obj = 'targetTouches' in e ? e.targetTouches[0] : e;
  return {
    pageX: obj.pageX,
    pageY: obj.pageY
  };
}
function useDrag(containerRef, direction, rawValues, min, max, formatValue, triggerChange, finishChange, offsetValues, editable, minCount) {
  var _React$useState = React.useState(null),
    _React$useState2 = _slicedToArray(_React$useState, 2),
    draggingValue = _React$useState2[0],
    setDraggingValue = _React$useState2[1];
  var _React$useState3 = React.useState(-1),
    _React$useState4 = _slicedToArray(_React$useState3, 2),
    draggingIndex = _React$useState4[0],
    setDraggingIndex = _React$useState4[1];
  var _React$useState5 = React.useState(false),
    _React$useState6 = _slicedToArray(_React$useState5, 2),
    draggingDelete = _React$useState6[0],
    setDraggingDelete = _React$useState6[1];
  var _React$useState7 = React.useState(rawValues),
    _React$useState8 = _slicedToArray(_React$useState7, 2),
    cacheValues = _React$useState8[0],
    setCacheValues = _React$useState8[1];
  var _React$useState9 = React.useState(rawValues),
    _React$useState10 = _slicedToArray(_React$useState9, 2),
    originValues = _React$useState10[0],
    setOriginValues = _React$useState10[1];
  var mouseMoveEventRef = React.useRef(null);
  var mouseUpEventRef = React.useRef(null);
  var _React$useContext = React.useContext(UnstableContext),
    onDragStart = _React$useContext.onDragStart,
    onDragChange = _React$useContext.onDragChange;
  React.useLayoutEffect(function () {
    if (draggingIndex === -1) {
      setCacheValues(rawValues);
    }
  }, [rawValues, draggingIndex]);

  // Clean up event
  React.useEffect(function () {
    return function () {
      document.removeEventListener('mousemove', mouseMoveEventRef.current);
      document.removeEventListener('mouseup', mouseUpEventRef.current);
      document.removeEventListener('touchmove', mouseMoveEventRef.current);
      document.removeEventListener('touchend', mouseUpEventRef.current);
    };
  }, []);
  var flushValues = function flushValues(nextValues, nextValue, deleteMark) {
    // Perf: Only update state when value changed
    if (nextValue !== undefined) {
      setDraggingValue(nextValue);
    }
    setCacheValues(nextValues);
    var changeValues = nextValues;
    if (deleteMark) {
      changeValues = nextValues.filter(function (_, i) {
        return i !== draggingIndex;
      });
    }
    triggerChange(changeValues);
    if (onDragChange) {
      onDragChange({
        rawValues: nextValues,
        deleteIndex: deleteMark ? draggingIndex : -1,
        draggingIndex: draggingIndex,
        draggingValue: nextValue
      });
    }
  };
  var updateCacheValue = useEvent(function (valueIndex, offsetPercent, deleteMark) {
    if (valueIndex === -1) {
      // >>>> Dragging on the track
      var startValue = originValues[0];
      var endValue = originValues[originValues.length - 1];
      var maxStartOffset = min - startValue;
      var maxEndOffset = max - endValue;

      // Get valid offset
      var offset = offsetPercent * (max - min);
      offset = Math.max(offset, maxStartOffset);
      offset = Math.min(offset, maxEndOffset);

      // Use first value to revert back of valid offset (like steps marks)
      var formatStartValue = formatValue(startValue + offset);
      offset = formatStartValue - startValue;
      var cloneCacheValues = originValues.map(function (val) {
        return val + offset;
      });
      flushValues(cloneCacheValues);
    } else {
      // >>>> Dragging on the handle
      var offsetDist = (max - min) * offsetPercent;

      // Always start with the valueIndex origin value
      var cloneValues = _toConsumableArray(cacheValues);
      cloneValues[valueIndex] = originValues[valueIndex];
      var next = offsetValues(cloneValues, offsetDist, valueIndex, 'dist');
      flushValues(next.values, next.value, deleteMark);
    }
  });
  var onStartMove = function onStartMove(e, valueIndex, startValues) {
    e.stopPropagation();

    // 如果是点击 track 触发的，需要传入变化后的初始值，而不能直接用 rawValues
    var initialValues = startValues || rawValues;
    var originValue = initialValues[valueIndex];
    setDraggingIndex(valueIndex);
    setDraggingValue(originValue);
    setOriginValues(initialValues);
    setCacheValues(initialValues);
    setDraggingDelete(false);
    var _getPosition = getPosition(e),
      startX = _getPosition.pageX,
      startY = _getPosition.pageY;

    // We declare it here since closure can't get outer latest value
    var deleteMark = false;

    // Internal trigger event
    if (onDragStart) {
      onDragStart({
        rawValues: initialValues,
        draggingIndex: valueIndex,
        draggingValue: originValue
      });
    }

    // Moving
    var onMouseMove = function onMouseMove(event) {
      event.preventDefault();
      var _getPosition2 = getPosition(event),
        moveX = _getPosition2.pageX,
        moveY = _getPosition2.pageY;
      var offsetX = moveX - startX;
      var offsetY = moveY - startY;
      var _containerRef$current = containerRef.current.getBoundingClientRect(),
        width = _containerRef$current.width,
        height = _containerRef$current.height;
      var offSetPercent;
      var removeDist;
      switch (direction) {
        case 'btt':
          offSetPercent = -offsetY / height;
          removeDist = offsetX;
          break;
        case 'ttb':
          offSetPercent = offsetY / height;
          removeDist = offsetX;
          break;
        case 'rtl':
          offSetPercent = -offsetX / width;
          removeDist = offsetY;
          break;
        default:
          offSetPercent = offsetX / width;
          removeDist = offsetY;
      }

      // Check if need mark remove
      deleteMark = editable ? Math.abs(removeDist) > REMOVE_DIST && minCount < cacheValues.length : false;
      setDraggingDelete(deleteMark);
      updateCacheValue(valueIndex, offSetPercent, deleteMark);
    };

    // End
    var onMouseUp = function onMouseUp(event) {
      event.preventDefault();
      document.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('touchend', onMouseUp);
      document.removeEventListener('touchmove', onMouseMove);
      mouseMoveEventRef.current = null;
      mouseUpEventRef.current = null;
      finishChange(deleteMark);
      setDraggingIndex(-1);
      setDraggingDelete(false);
    };
    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('touchend', onMouseUp);
    document.addEventListener('touchmove', onMouseMove);
    mouseMoveEventRef.current = onMouseMove;
    mouseUpEventRef.current = onMouseUp;
  };

  // Only return cache value when it mapping with rawValues
  var returnValues = React.useMemo(function () {
    var sourceValues = _toConsumableArray(rawValues).sort(function (a, b) {
      return a - b;
    });
    var targetValues = _toConsumableArray(cacheValues).sort(function (a, b) {
      return a - b;
    });
    var counts = {};
    targetValues.forEach(function (val) {
      counts[val] = (counts[val] || 0) + 1;
    });
    sourceValues.forEach(function (val) {
      counts[val] = (counts[val] || 0) - 1;
    });
    var maxDiffCount = editable ? 1 : 0;
    var diffCount = Object.values(counts).reduce(function (prev, next) {
      return prev + Math.abs(next);
    }, 0);
    return diffCount <= maxDiffCount ? cacheValues : rawValues;
  }, [rawValues, cacheValues, editable]);
  return [draggingIndex, draggingValue, draggingDelete, returnValues, onStartMove];
}
export default useDrag;