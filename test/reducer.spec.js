/* globals describe it */
import assert from 'assert'
import { requests, request, sorted, unsorted, array, single, messages } from '../src/reducers'

describe('reducers', () => {
  describe('request (internal helper)', () => {
    it('unknown action type does nothing', () => {
      const action = {
        type: 'JET_NOT_YET_IMPLEMENTED',
        path: 'foo',
        value: 123,
        id: 'bar'
      }
      const req = request(123, action)
      assert.strictEqual(req, 123)
    })

    it('JET_SET_REQUEST', () => {
      const action = {
        type: 'JET_SET_REQUEST',
        path: 'foo',
        value: 123,
        id: 'bar'
      }
      const req = request(undefined, action)
      assert.strictEqual(req.path, 'foo')
      assert.strictEqual(req.value, 123)
      assert.strictEqual(req.pending, true)
      assert.strictEqual(req.id, 'bar')
    })

    it('JET_CALL_REQUEST', () => {
      const action = {
        type: 'JET_CALL_REQUEST',
        path: 'foo',
        args: [1, 2],
        id: 'bar'
      }
      const req = request(undefined, action)
      assert.strictEqual(req.path, 'foo')
      assert.deepStrictEqual(req.args, [1, 2])
      assert.strictEqual(req.pending, true)
      assert.strictEqual(req.id, 'bar')
    })

    it('JET_SET_SUCCESS', () => {
      const prev = {
        path: 'foo',
        value: 123,
        id: 'bar',
        pending: true
      }
      const action = {
        type: 'JET_SET_SUCCESS',
        id: 'bar'
      }
      const req = request(prev, action)
      assert.strictEqual(req.path, 'foo')
      assert.strictEqual(req.value, 123)
      assert.strictEqual(req.pending, false)
      assert.strictEqual(req.id, 'bar')
    })

    it('JET_CALL_SUCCESS', () => {
      const prev = {
        path: 'foo',
        args: [1, 2],
        id: 'bar',
        pending: true
      }
      const action = {
        type: 'JET_CALL_SUCCESS',
        id: 'bar',
        result: 123
      }
      const req = request(prev, action)
      assert.strictEqual(req.path, 'foo')
      assert.strictEqual(req.result, 123)
      assert.strictEqual(req.pending, false)
      assert.strictEqual(req.id, 'bar')
      assert.deepStrictEqual(req.args, [1, 2])
    })

    it('JET_SET_FAILURE', () => {
      const prev = {
        path: 'foo',
        value: 123,
        id: 'bar',
        pending: true
      }
      const action = {
        type: 'JET_SET_FAILURE',
        error: 'arg',
        id: 'bar'
      }
      const req = request(prev, action)
      assert.strictEqual(req.path, 'foo')
      assert.strictEqual(req.value, 123)
      assert.strictEqual(req.pending, false)
      assert.strictEqual(req.id, 'bar')
      assert.strictEqual(req.error, 'arg')
    })

    it('JET_CALL_FAILURE', () => {
      const prev = {
        path: 'foo',
        args: [1, 2],
        id: 'bar',
        pending: true
      }
      const action = {
        type: 'JET_CALL_FAILURE',
        error: 'arg',
        id: 'bar'
      }
      const req = request(prev, action)
      assert.strictEqual(req.path, 'foo')
      assert.deepStrictEqual(req.args, [1, 2])
      assert.strictEqual(req.pending, false)
      assert.strictEqual(req.id, 'bar')
      assert.strictEqual(req.error, 'arg')
    })

    it('JET_CALL_SUCCESS other id', () => {
      const prev = {
        path: 'foo',
        args: [1, 2],
        id: 'bar',
        pending: true
      }
      const action = {
        type: 'JET_CALL_SUCCESS',
        id: 'bar2',
        result: 123
      }
      const req = request(prev, action)
      assert.strictEqual(req, prev)
    })

    it('JET_CALL_SUCCESS other id', () => {
      const prev = {
        path: 'foo',
        args: [1, 2],
        id: 'bar',
        pending: true
      }
      const action = {
        type: 'JET_CALL_SUCCESS',
        id: 'bar2',
        result: 123
      }
      const req = request(prev, action)
      assert.strictEqual(req, prev)
    })

    it('JET_SET_FAILURE other id', () => {
      const prev = {
        path: 'foo',
        value: 123,
        id: 'bar',
        pending: true
      }
      const action = {
        type: 'JET_SET_FAILURE',
        error: 'arg',
        id: 'bar2'
      }
      const req = request(prev, action)
      assert.strictEqual(req, prev)
    })

    it('JET_CALL_FAILURE other id', () => {
      const prev = {
        path: 'foo',
        args: [1, 2],
        id: 'bar',
        pending: true
      }
      const action = {
        type: 'JET_CALL_FAILURE',
        error: 'arg',
        id: 'bar2'
      }
      const req = request(prev, action)
      assert.strictEqual(req, prev)
    })
  })

  describe('requests', () => {
    it('defaults to empty array', () => {
      const req = requests()
      assert.deepStrictEqual(req(undefined, {}), [])
    })

    it('JET_CLOSE clears array', () => {
      const req = requests()
      const state = req([12, 23], {
        type: 'JET_CLOSE'
      })
      assert.deepStrictEqual(state, [])
    })

    it('push request', () => {
      const req = requests()
      const action = {
        type: 'JET_SET_REQUEST',
        path: 'foo',
        value: 123
      }
      const state = req([{ foo: 'bar' }], action)
      assert.strictEqual(state.length, 2)
      assert.deepStrictEqual(state[0], { foo: 'bar' })
      const { path, value, pending } = state[1]
      assert.strictEqual(path, 'foo')
      assert.strictEqual(value, 123)
      assert.strictEqual(pending, true)
    })

    it('push request pops old prev requests', () => {
      const req = requests(2)
      const action = {
        type: 'JET_SET_REQUEST',
        path: 'foo',
        value: 123
      }
      const state = req([{ foo: 'bar' }, { bla: 'foo' }], action)
      assert.strictEqual(state.length, 2)
      assert.deepStrictEqual(state[0], { bla: 'foo' })
      const { path, value, pending } = state[1]
      assert.strictEqual(path, 'foo')
      assert.strictEqual(value, 123)
      assert.strictEqual(pending, true)
    })

    it('modifies existing request', () => {
      const req = requests()
      const action = {
        type: 'JET_SET_SUCCESS',
        id: 'bar'
      }
      const prev = [{
        id: 'bar',
        pending: true,
        value: 123,
        path: 'foo'
      }]
      const state = req(prev, action)
      assert.strictEqual(state.length, 1)
      const { path, value, pending } = state[0]
      assert.strictEqual(path, 'foo')
      assert.strictEqual(value, 123)
      assert.strictEqual(pending, false)
    })
  })

  describe('sorted', () => {
    it('default is empty array', () => {
      assert.deepStrictEqual(sorted('foo')(undefined, {}), [])
    })

    it('JET_CLOSE clears array', () => {
      const s = sorted('foo')
      const state = s([12, 23], {
        type: 'JET_CLOSE'
      })
      assert.deepStrictEqual(state, [])
    })

    it('returns empty array for JET_FETCHER_FAILURE', () => {
      const action = {
        type: 'JET_FETCHER_FAILURE',
        id: 'foo'
      }
      assert.deepStrictEqual(sorted('foo')(undefined, action), [])
    })

    it('returns empty array for JET_UNFETCH', () => {
      const action = {
        type: 'JET_UNFETCH',
        id: 'foo'
      }
      assert.deepStrictEqual(sorted('foo')([{ foo: 123 }], action), [])
    })

    it('returns empty array for JET_FETCHER_REQUEST', () => {
      const action = {
        type: 'JET_FETCHER_REQUEST',
        id: 'foo'
      }
      assert.deepStrictEqual(sorted('foo')(undefined, action), [])
    })

    it('returns empty array for JET_FETCHER_DATA with non sorting expression', () => {
      const action = {
        type: 'JET_FETCHER_DATA',
        id: 'foo',
        expression: {}
      }
      assert.deepStrictEqual(sorted('foo')(undefined, action), [])
    })

    it('returns array with data from JET_FETCHER_DATA', () => {
      const action = {
        type: 'JET_FETCHER_DATA',
        data: [[{ path: 'asd', value: 123, index: 1 }], 1],
        id: 'foo',
        expression: {
          sort: {
            from: 1
          }
        }
      }
      const state = sorted('foo')([{ path: 'asd', value: 123, index: 1 }], action)
      assert.deepStrictEqual(state, [{ path: 'asd', value: 123, index: 1 }])
    })

    it('adds request data with data from JET_SET_REQUEST', () => {
      const action = {
        type: 'JET_SET_REQUEST',
        path: 'asd',
        value: 3334,
        id: 3
      }
      const state = sorted('foo')([{ path: 'asd', value: 123, index: 1 }], action)
      const expected = {
        path: 'asd',
        value: 123,
        index: 1,
        request: {
          pending: true,
          value: 3334,
          id: 3
        }
      }
      assert.deepStrictEqual(state, [expected])
    })

    it('returns unmodified state if JET_SET_REQUEST path does not match', () => {
      const action = {
        type: 'JET_SET_REQUEST',
        path: 'asd3',
        value: 3334,
        id: 3
      }
      const initial = {
        path: 'asd',
        value: 123,
        index: 1
      }
      const state = sorted('foo')([initial], action)
      assert.deepStrictEqual(state, [initial])
    })

    it('JET_SET_REQUEST overwrites old request', () => {
      const action = {
        type: 'JET_SET_REQUEST',
        path: 'asd',
        value: 3334,
        id: 3
      }
      const initial = {
        path: 'asd',
        value: 123,
        index: 1,
        request: {
          value: 321,
          pending: true,
          id: 5
        }
      }
      const expected = {
        path: 'asd',
        value: 123,
        index: 1,
        request: {
          pending: true,
          value: 3334,
          id: 3
        }
      }
      const state = sorted('foo')([initial], action)
      assert.deepStrictEqual(state, [expected])
    })

    it('JET_SET_SUCCESS sets result', () => {
      const action = {
        type: 'JET_SET_SUCCESS',
        path: 'asd',
        value: 321,
        id: 3,
        result: true
      }
      const initial = {
        path: 'asd',
        value: 123,
        index: 1,
        request: {
          value: 321,
          pending: true,
          id: 3
        }
      }
      const expected = {
        path: 'asd',
        value: 123, // value will not be changed by this action
        index: 1,
        request: {
          pending: false,
          value: 321,
          result: true,
          id: 3
        }
      }
      const state = sorted('foo')([initial], action)
      assert.deepStrictEqual(state, [expected])
    })

    it('JET_SET_FAILURE sets result', () => {
      const action = {
        type: 'JET_SET_FAILURE',
        path: 'asd',
        value: 321,
        id: 3,
        error: 'arg'
      }
      const initial = {
        path: 'asd',
        value: 123,
        index: 1,
        request: {
          value: 321,
          pending: true,
          id: 3
        }
      }
      const expected = {
        path: 'asd',
        value: 123,
        index: 1,
        request: {
          pending: false,
          value: 321,
          error: 'arg',
          id: 3
        }
      }
      const state = sorted('foo')([initial], action)
      assert.deepStrictEqual(state, [expected])
    })

    it('JET_GET_SUCCESS sets result', () => {
      const action = {
        type: 'JET_GET_SUCCESS',
        expression: 'foo',
        id: 'bar',
        result: [{ path: 'hello', value: 'world' }]
      }
      const state = sorted('bar')([], action)
      assert.deepStrictEqual(state, [{
        path: 'hello',
        value: 'world'
      }])
    })

    it('returns unmodified state if same id but unknown action.type', () => {
      const action = {
        type: 'JET_NOT_YET_IMPLEMENTED',
        id: 'foo'
      }
      const state = sorted('foo')([4, 2], action)
      assert.deepStrictEqual(state, [4, 2])
    })
  })

  describe('array', () => {
    it('default is empty array', () => {
      assert.deepStrictEqual(array('foo')(undefined, {}), [])
    })

    it('JET_CLOSE clears array', () => {
      const a = array('foo')
      const state = a([12, 23], {
        type: 'JET_CLOSE'
      })
      assert.deepStrictEqual(state, [])
    })

    it('returns empty array for JET_FETCHER_FAILURE', () => {
      const action = {
        type: 'JET_FETCHER_FAILURE',
        id: 'foo'
      }
      assert.deepStrictEqual(array('foo')(undefined, action), [])
    })

    it('returns empty array for JET_UNFETCH', () => {
      const action = {
        type: 'JET_UNFETCH',
        id: 'foo'
      }
      assert.deepStrictEqual(array('foo')([{ foo: 123 }], action), [])
    })

    it('returns empty array for JET_FETCHER_REQUEST', () => {
      const action = {
        type: 'JET_FETCHER_REQUEST',
        id: 'foo'
      }
      assert.deepStrictEqual(array('foo')(undefined, action), [])
    })

    it('adds request data with data from JET_SET_REQUEST', () => {
      const action = {
        type: 'JET_SET_REQUEST',
        path: 'asd',
        value: 3334,
        id: 3
      }
      const state = array('foo')([{ path: 'asd', value: 123, index: 1 }], action)
      const expected = {
        path: 'asd',
        value: 123,
        index: 1,
        request: {
          pending: true,
          value: 3334,
          id: 3
        }
      }
      assert.deepStrictEqual(state, [expected])
    })

    it('returns array with data from JET_FETCHER_DATA (data is sorted) new element', () => {
      const action = {
        type: 'JET_FETCHER_DATA',
        data: [[{ path: 'asd', value: 22, index: 3 }], 1],
        id: 'foo',
        expression: {
          sort: {
            from: 3
          }
        }
      }
      const prevState = []
      const state = array('foo')(prevState, action)
      const expected = [
        { path: 'asd', value: 22, index: 3 }
      ]
      assert.deepStrictEqual(state, expected)
    })

    it('returns array with data from JET_FETCHER_DATA (data is sorted) change position', () => {
      const action = {
        type: 'JET_FETCHER_DATA',
        data: [[{ path: 'asd', value: 22, index: 3 }], 1],
        id: 'foo',
        expression: {
          sort: {
            from: 3
          }
        }
      }
      const prevState = [
        { path: 'foo', value: 123, index: 3 },
        { path: 'asd', value: 2, index: 4, request: 10 }
      ]
      const state = array('foo')(prevState, action)
      const expected = [
        { path: 'asd', value: 22, index: 3, request: 10 }
      ]
      assert.deepStrictEqual(state, expected)
    })

    it('returns array with data from JET_FETCHER_DATA (data is unsorted / "add" event)', () => {
      const action = {
        type: 'JET_FETCHER_DATA',
        data: [{ path: 'foo', event: 'add', value: 123 }],
        id: 'foo',
        expression: {}
      }
      const state = array('foo')([{ path: 'bar', value: 444 }], action)
      assert.deepStrictEqual(state, [
        {
          path: 'bar',
          value: 444
        },
        {
          path: 'foo',
          value: 123,
          fetchOnly: false
        }
      ])
    })

    it('returns array with data from JET_FETCHER_DATA (data is unsorted / "change" event)', () => {
      const action = {
        type: 'JET_FETCHER_DATA',
        data: [{ path: 'foo', event: 'change', value: 123 }],
        id: 'foo',
        expression: {}
      }
      const state = array('foo')([{ path: 'foo', value: 444 }], action)
      assert.deepStrictEqual(state, [
        {
          path: 'foo',
          value: 123
        }
      ])
    })

    it('returns array with data from JET_FETCHER_DATA (data is unsorted / "remove" event)', () => {
      const action = {
        type: 'JET_FETCHER_DATA',
        data: [{ path: 'foo', event: 'remove' }],
        id: 'foo',
        expression: {}
      }
      const state = array('foo')([{ path: 'foo', value: 444 }], action)
      assert.deepStrictEqual(state, [])
    })

    it('JET_GET_SUCCESS sets result', () => {
      const action = {
        type: 'JET_GET_SUCCESS',
        expression: 'foo',
        id: 'bar',
        result: [{ path: 'hello', value: 'world' }]
      }
      const state = array('bar')([], action)
      assert.deepStrictEqual(state, [{
        path: 'hello',
        value: 'world'
      }])
    })

    it('returns unmodified state if same id but unknown action.type', () => {
      const action = {
        type: 'JET_NOT_YET_IMPLEMENTED',
        id: 'foo'
      }
      const state = array('foo')([4, 2], action)
      assert.deepStrictEqual(state, [4, 2])
    })
  })

  describe('unsorted', () => {
    it('default is empty object', () => {
      assert.deepStrictEqual(unsorted('foo')(undefined, {}), {})
    })

    it('JET_CLOSE clears object', () => {
      const u = unsorted('foo')
      const state = u({ x: 123 }, {
        type: 'JET_CLOSE'
      })
      assert.deepStrictEqual(state, {})
    })

    it('returns empty object for JET_FETCHER_FAILURE', () => {
      const action = {
        type: 'JET_FETCHER_FAILURE',
        id: 'foo'
      }
      assert.deepStrictEqual(unsorted('foo')(undefined, action), {})
    })

    it('returns empty object for JET_UNFETCH', () => {
      const action = {
        type: 'JET_UNFETCH',
        id: 'foo'
      }
      assert.deepStrictEqual(unsorted('foo')({ foo: 123 }, action), {})
    })

    it('returns empty object for JET_FETCHER_REQUEST', () => {
      const action = {
        type: 'JET_FETCHER_REQUEST',
        id: 'foo'
      }
      assert.deepStrictEqual(unsorted('foo')(undefined, action), {})
    })

    it('adds request data with data from JET_SET_REQUEST', () => {
      const action = {
        type: 'JET_SET_REQUEST',
        path: 'asd',
        value: 3334,
        id: 3
      }
      const state = unsorted('foo')({ asd: { value: 123 } }, action)
      const expected = {
        asd: {
          value: 123,
          request: {
            pending: true,
            value: 3334,
            id: 3
          }
        }
      }
      assert.deepStrictEqual(state, expected)
    })

    it('returns object with data from JET_FETCHER_DATA / add event', () => {
      const action = {
        type: 'JET_FETCHER_DATA',
        data: [{
          path: 'bla',
          value: 123,
          event: 'add',
          fetchOnly: true
        }],
        id: 'foo'
      }
      const state = unsorted('foo')(undefined, action)
      assert.deepStrictEqual(state, { bla: { value: 123, fetchOnly: true } })
    })

    it('returns object with data from JET_FETCHER_DATA / change event', () => {
      const action = {
        type: 'JET_FETCHER_DATA',
        data: [{
          path: 'bla',
          value: 123,
          event: 'change'
        }],
        id: 'foo'
      }
      const state = unsorted('foo')({ bla: { value: 333 } }, action)
      assert.deepStrictEqual(state, { bla: { value: 123, fetchOnly: false } })
    })

    it('returns object with data from JET_FETCHER_DATA / remove event', () => {
      const action = {
        type: 'JET_FETCHER_DATA',
        data: [{
          path: 'bla',
          value: 123,
          event: 'remove'
        }],
        id: 'foo'
      }
      const state = unsorted('foo')({ bla: { value: 123 } }, action)
      assert.deepStrictEqual(state, {})
    })

    it('JET_GET_SUCCESS sets result', () => {
      const action = {
        type: 'JET_GET_SUCCESS',
        expression: 'foo',
        id: 'bar',
        result: [{ path: 'hello', value: 'world' }]
      }
      const state = unsorted('bar')([], action)
      assert.deepStrictEqual(state, [{
        path: 'hello',
        value: 'world'
      }])
    })

    it('returns unmodified state if same id but unknown action.type', () => {
      const action = {
        type: 'JET_NOT_YET_IMPLEMENTED',
        id: 'foo'
      }
      const state = unsorted('foo')({ foo: 123 }, action)
      assert.deepStrictEqual(state, { foo: 123 })
    })
  })

  describe('messages', () => {
    it('default is []', () => {
      assert.deepStrictEqual(messages(3)(undefined, {}), [])
    })

    it('prepends JET_DEBUG actions', () => {
      const action1 = {
        type: 'JET_DEBUG',
        x: 123
      }
      const action2 = {
        type: 'JET_DEBUG',
        x: 333
      }
      const reducer = messages(3)
      const state = reducer(reducer(undefined, action1), action2)
      assert.deepStrictEqual(state, [action2, action1])
    })

    it('maxLength defaults to 1000', () => {
      let i = 0
      let state
      const reducer = messages()
      for (i = 0; i < 1000; ++i) {
        state = reducer(state, { type: 'JET_DEBUG' })
        assert(state.length <= 1000)
      }
      assert.strictEqual(state.length, 1000)
      state = reducer(state, { type: 'JET_DEBUG' })
      assert.strictEqual(state.length, 1000)
    })

    it('discards old JET_DEBUG actions', () => {
      const action1 = {
        type: 'JET_DEBUG',
        x: 123
      }
      const action2 = {
        type: 'JET_DEBUG',
        x: 333
      }
      const action3 = {
        type: 'JET_DEBUG',
        x: 444
      }
      const reducer = messages(2)
      const state = reducer(reducer(reducer(undefined, action1), action2), action3)
      assert.deepStrictEqual(state, [action3, action2])
    })
  })

  describe('single', () => {
    it('default is null', () => {
      assert.strictEqual(single('foo')(undefined, {}), null)
    })

    it('JET_CLOSE clears state', () => {
      const s = single('foo')
      const state = s({ x: 123 }, {
        type: 'JET_CLOSE'
      })
      assert.deepStrictEqual(state, null)
    })

    it('returns null for JET_FETCHER_FAILURE', () => {
      const action = {
        type: 'JET_FETCHER_FAILURE',
        id: 'foo'
      }
      assert.strictEqual(single('foo')(undefined, action), null)
    })

    it('returns null for JET_UNFETCH', () => {
      const action = {
        type: 'JET_UNFETCH',
        id: 'foo'
      }
      assert.strictEqual(single('foo')({ foo: 123 }, action), null)
    })

    it('returns null for JET_FETCHER_REQUEST', () => {
      const action = {
        type: 'JET_FETCHER_REQUEST',
        id: 'foo'
      }
      assert.strictEqual(single('foo')(undefined, action), null)
    })

    it('returns object with data.value from JET_FETCHER_DATA / add event', () => {
      const action = {
        type: 'JET_FETCHER_DATA',
        data: [{
          path: 'bla',
          value: 123,
          event: 'add'
        }],
        id: 'foo'
      }
      const state = single('foo')(undefined, action)
      assert.deepStrictEqual(state, { value: 123, fetchOnly: false, path: 'bla' })
    })

    it('returns object with data.value from JET_FETCHER_DATA / change event', () => {
      const action = {
        type: 'JET_FETCHER_DATA',
        data: [{
          path: 'bla',
          value: 123,
          event: 'change'
        }],
        id: 'foo'
      }
      const state = single('foo')(undefined, action)
      assert.deepStrictEqual(state, { value: 123, path: 'bla', fetchOnly: false })
    })

    it('returns null from JET_FETCHER_DATA / remove event', () => {
      const action = {
        type: 'JET_FETCHER_DATA',
        data: [{
          path: 'bla',
          value: 123,
          event: 'remove'
        }],
        id: 'foo'
      }
      const state = single('foo')(undefined, action)
      assert.strictEqual(state, null)
    })

    it('adds request entry for JET_CALL_REQUEST action', () => {
      const action = {
        type: 'JET_CALL_REQUEST',
        path: 'bla',
        args: [333],
        id: 'ddd'
      }
      const initial = {
        path: 'bla',
        fetchOnly: true
      }
      const state = single('foo')(initial, action)
      assert.deepStrictEqual(state, {
        ...initial,
        request: {
          pending: true,
          args: [333],
          id: 'ddd'
        }
      })
    })

    it('JET_GET_SUCCESS sets result', () => {
      const action = {
        type: 'JET_GET_SUCCESS',
        expression: 'foo',
        id: 'bar',
        result: [{ path: 'hello', value: 'world' }]
      }
      const state = single('bar')([], action)
      assert.strictEqual(state.value, 'world')
    })

    it('returns unmodified state if same id but unknown action.type', () => {
      const action = {
        type: 'JET_NOT_YET_IMPLEMENTED',
        id: 'foo'
      }
      const state = single('foo')(123, action)
      assert.strictEqual(state, 123)
    })
  })
})
