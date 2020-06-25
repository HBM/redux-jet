/* globals describe it before afterEach */
import assert from 'assert'
import { connect, close, set, call, fetch, unfetch, get, addState, addMethod, remove, change } from '../src/actions'
import { Daemon, Peer, State, Method } from 'node-jet'

const url = 'ws://localhost:11123'
const noop = () => {}

describe('actions', () => {
  let daemon
  let peer

  before(() => {
    daemon = new Daemon()
    daemon.listen()

    peer = new Peer()
    return peer.connect()
  })

  describe('connect', () => {
    afterEach(() => {
      close({ url })(noop)
    })

    it('ok', (done) => {
      let i = 0
      connect({ url })((action) => {
        if (i === 0) {
          assert.deepStrictEqual(action, {
            type: 'JET_CONNECT_REQUEST',
            url,
            password: undefined,
            user: undefined,
            headers: undefined
          })
          ++i
        } else {
          assert.deepStrictEqual(action, {
            type: 'JET_CONNECT_SUCCESS',
            url,
            password: undefined,
            user: undefined,
            headers: undefined
          })
          done()
        }
      })
    })

    it('with debug', (done) => {
      let i = 0
      connect({ url }, true)((action) => {
        if (action.type !== 'JET_DEBUG') {
          return
        }
        if (i === 0) {
          assert.strictEqual(action.direction, 'out')
          assert.strictEqual(typeof action.string, 'string')
          assert.doesNotThrow(() => new Date(action.timestamp))
          assert.strictEqual(typeof action.json, 'object')
          ++i
        } else if (i === 1) {
          assert.strictEqual(action.direction, 'in')
          assert.strictEqual(typeof action.string, 'string')
          assert.doesNotThrow(() => new Date(action.timestamp))
          assert.strictEqual(typeof action.json, 'object')
          done()
        }
      })
    })

    it('twice (fast)', done => {
      close({ url })(noop)
      connect({ url })(noop)
      connect({ url })(action => {
        if (action.type === 'JET_CONNECT_SUCCESS') {
          done()
        }
      })
    })

    it('fail', (done) => {
      let i = 0
      connect({ url: 'ws://foo.bar:11123' })((action) => {
        if (i === 0) {
          assert.deepStrictEqual(action, {
            type: 'JET_CONNECT_REQUEST',
            url: 'ws://foo.bar:11123',
            password: undefined,
            user: undefined,
            headers: undefined
          })
          ++i
        } else if (i === 1) {
          const { type, url, error } = action
          assert.strictEqual(type, 'JET_CONNECT_FAILURE')
          assert.strictEqual(url, 'ws://foo.bar:11123')
          assert(error)
          done()
        }
      }).catch(noop)
    })
  })

  it('connect (wait) -> close', (done) => {
    connect({ url })((action) => {
      if (action.type === 'JET_CONNECT_SUCCESS') {
        close({ url })(noop)
      }
      if (action.type === 'JET_CLOSED') {
        done()
      }
    })
  })

  it('connect -> close', (done) => {
    connect({ url })((action) => {
      if (action.type === 'JET_CONNECT_FAILURE') {
        done()
      }
    }).catch(noop)
    close({ url })(noop)
  })

  it('connect (wait) -> close(force)', (done) => {
    let unexpectedAction
    connect({ url })((action) => {
      if (action.type === 'JET_CONNECT_SUCCESS') {
        close({ url }, true)(noop)
      }
      if (action.type !== 'JET_CONNECT_SUCCESS' && action.type !== 'JET_CONNECT_REQUEST') {
        unexpectedAction = true
      }
    })
    setTimeout(() => {
      assert(!unexpectedAction)
      done()
    }, 100)
  })

  it('connect -> close(force)', (done) => {
    let unexpectedAction
    connect({ url })((action) => {
      if (action.type !== 'JET_CONNECT_FAILURE' && action.type !== 'JET_CONNECT_REQUEST') {
        unexpectedAction = true
      }
    }).catch(noop)
    close({ url }, true)(noop)
    setTimeout(() => {
      assert(!unexpectedAction)
      done()
    }, 100)
  })

  it('close', (done) => {
    close({ url: 'ws://localhost.bar:123' })(action => {
      assert.strictEqual(action.type, 'JET_CLOSE')
      done()
    })
  })

  describe('set', () => {
    let state
    let onSet

    before(() => {
      state = new State('abc')
      state.on('set', (val) => {
        return onSet(val)
      })
      return peer.add(state)
    })

    it('ok', (done) => {
      let i = 0
      let newVal
      onSet = (val) => {
        newVal = val
      }

      set({ url }, 'abc', 123)((action) => {
        if (i === 0) {
          const { path, value, id, type } = action
          assert.strictEqual(type, 'JET_SET_REQUEST')
          assert.strictEqual(path, 'abc')
          assert.strictEqual(value, 123)
          assert(id)
          ++i
        } else {
          const { path, value, id, type } = action
          assert.strictEqual(type, 'JET_SET_SUCCESS')
          assert.strictEqual(path, 'abc')
          assert.strictEqual(value, 123)
          assert(id)
          assert.strictEqual(newVal, 123)
          done()
        }
      })
    })

    it('fail', (done) => {
      let i = 0
      set({ url }, 'abc2', 123)((action) => {
        if (i === 0) {
          const { path, value, id, type } = action
          assert.strictEqual(type, 'JET_SET_REQUEST')
          assert.strictEqual(path, 'abc2')
          assert.strictEqual(value, 123)
          assert(id)
          ++i
        } else {
          const { path, id, type, error } = action
          assert.strictEqual(type, 'JET_SET_FAILURE')
          assert.strictEqual(path, 'abc2')
          assert(error)
          assert(id)
          done()
        }
      })
    })
  })

  describe('call', () => {
    let method
    let onCall

    before(() => {
      method = new Method('def')
      method.on('call', (args) => {
        return onCall(args)
      })
      return peer.add(method)
    })

    it('ok', (done) => {
      let i = 0
      let args
      onCall = (_args) => {
        args = _args
        return args[0] + args[1]
      }

      call({ url }, 'def', [1, 2])((action) => {
        if (i === 0) {
          const { path, args, id, type } = action
          assert.strictEqual(type, 'JET_CALL_REQUEST')
          assert.strictEqual(path, 'def')
          assert.deepStrictEqual(args, [1, 2])
          assert(id)
          ++i
        } else {
          const { path, result, id, type } = action
          assert.strictEqual(type, 'JET_CALL_SUCCESS')
          assert.strictEqual(path, 'def')
          assert.strictEqual(result, 3)
          assert(id)
          assert.deepStrictEqual(args, [1, 2])
          done()
        }
      })
    })

    it('fail', (done) => {
      let i = 0
      call({ url }, 'abc2', [1, 2])((action) => {
        if (i === 0) {
          const { path, args, id, type } = action
          assert.strictEqual(type, 'JET_CALL_REQUEST')
          assert.strictEqual(path, 'abc2')
          assert.deepStrictEqual(args, [1, 2])
          assert(id)
          ++i
        } else {
          const { path, id, type, error } = action
          assert.strictEqual(type, 'JET_CALL_FAILURE')
          assert.strictEqual(path, 'abc2')
          assert(error)
          assert(id)
          done()
        }
      })
    })
  })

  describe('get', () => {
    let state

    before(() => {
      state = new State('yyy', 444)
      return peer.add(state)
    })

    it('ok', (done) => {
      let i = 0
      const fexpression = {
        path: {
          equals: 'yyy'
        }
      }
      get({ url }, fexpression, 'someid')((action) => {
        if (i === 0) {
          const { expression, id, type } = action
          assert.strictEqual(type, 'JET_GET_REQUEST')
          assert.deepStrictEqual(expression, fexpression)
          assert.strictEqual(id, 'someid')
          ++i
        } else {
          assert.strictEqual(action.type, 'JET_GET_SUCCESS')
          assert.deepStrictEqual(action.expression.path, fexpression.path)
          assert.strictEqual(action.result[0].event, 'add')
          assert.strictEqual(action.result[0].path, 'yyy')
          assert.strictEqual(action.result[0].value, 444)
          assert.strictEqual(action.id, 'someid')
          done()
        }
      })
    })

    it('fail', (done) => {
      let i = 0
      const fexpression = 123
      get({ url }, fexpression, 'someid')((action) => {
        if (i === 0) {
          const { expression, id, type } = action
          assert.strictEqual(type, 'JET_GET_REQUEST')
          assert.deepStrictEqual(expression, fexpression)
          assert.strictEqual(id, 'someid')
          ++i
        } else {
          assert.strictEqual(action.type, 'JET_GET_FAILURE')
          assert.deepStrictEqual(action.expression, fexpression)
          assert(action.error)
          done()
        }
      })
    })
  })

  describe('fetch', () => {
    let state

    before(() => {
      state = new State('ppp', 444)
      return peer.add(state)
    })

    it('ok', (done) => {
      let i = 0
      const fexpression = {
        path: {
          equals: 'ppp'
        }
      }
      fetch({ url }, fexpression, 'someid')((action) => {
        if (i === 0) {
          const { expression, id, type } = action
          assert.strictEqual(type, 'JET_FETCHER_REQUEST')
          assert.deepStrictEqual(expression, fexpression)
          assert.strictEqual(id, 'someid')
          ++i
        } else if (i === 1) {
          const { expression, id, type } = action
          assert.strictEqual(type, 'JET_FETCHER_SUCCESS')
          assert.deepStrictEqual(expression, fexpression)
          assert.strictEqual(id, 'someid')
          ++i
        } else {
          assert.strictEqual(action.type, 'JET_FETCHER_DATA')
          assert.deepStrictEqual(action.expression.path, fexpression.path)
          assert.strictEqual(action.data[0].event, 'add')
          assert.strictEqual(action.data[0].path, 'ppp')
          assert.strictEqual(action.data[0].value, 444)
          assert.strictEqual(action.id, 'someid')
          unfetch({ url }, 'someid')
          done()
        }
      })
    })

    it('change fetcher', (done) => {
      let i = 0
      const fexpression = {
        path: {
          equals: 'ppp'
        }
      }
      fetch({ url }, { path: { equals: '33' } }, 'someid')(() => {})
      fetch({ url }, fexpression, 'someid')((action) => {
        if (i === 0) {
          const { expression, id, type } = action
          assert.strictEqual(type, 'JET_FETCHER_REQUEST')
          assert.deepStrictEqual(expression, fexpression)
          assert.strictEqual(id, 'someid')
          ++i
        } else if (i === 1) {
          const { expression, id, type } = action
          assert.strictEqual(type, 'JET_FETCHER_SUCCESS')
          assert.deepStrictEqual(expression, fexpression)
          assert.strictEqual(id, 'someid')
          ++i
        } else {
          assert.strictEqual(action.type, 'JET_FETCHER_DATA')
          assert.deepStrictEqual(action.expression.path, fexpression.path)
          assert.strictEqual(action.data[0].event, 'add')
          assert.strictEqual(action.data[0].path, 'ppp')
          assert.strictEqual(action.data[0].value, 444)
          assert.strictEqual(action.id, 'someid')
          unfetch({ url }, 'someid')
          done()
        }
      })
    })

    it('fail', (done) => {
      let i = 0
      fetch({ url }, 1, 'someid')((action) => {
        if (i === 0) {
          const { expression, id, type } = action
          assert.strictEqual(type, 'JET_FETCHER_REQUEST')
          assert.strictEqual(expression, 1)
          assert.strictEqual(id, 'someid')
          ++i
        } else if (i === 1) {
          const { expression, id, type, error } = action
          assert.strictEqual(type, 'JET_FETCHER_FAILURE')
          assert.strictEqual(expression, 1)
          assert.strictEqual(id, 'someid')
          assert(error)
          unfetch({ url }, 'someid')
          done()
        }
      })
    })

    it('sorted', (done) => {
      let i = 0
      const expression = {
        path: {
          startsWith: 'ppp'
        },
        sort: {
          byPath: true,
          from: 1,
          to: 10
        }
      }
      const s2 = new State('ppp2', 3)
      peer.add(s2).then(() => {
        fetch({ url }, expression, 'someid')((action) => {
          if (i === 0) {
            assert.strictEqual(action.type, 'JET_FETCHER_REQUEST')
            ++i
          } else if (i === 1) {
            assert.strictEqual(action.type, 'JET_FETCHER_SUCCESS')
            ++i
          } else if (i === 2) {
            assert.strictEqual(action.type, 'JET_FETCHER_DATA')
            const expected = [
              [
                { path: 'ppp', value: 444, fetchOnly: true, index: 1 },
                { path: 'ppp2', value: 3, fetchOnly: true, index: 2 }
              ],
              2
            ]
            assert.deepStrictEqual(action.data, expected)
            s2.value(6666)
            ++i
          } else if (i === 3) {
            assert.strictEqual(action.type, 'JET_FETCHER_DATA')
            const expected = [
              [
                { path: 'ppp2', value: 6666, fetchOnly: true, index: 2 }
              ],
              2
            ]
            assert.deepStrictEqual(action.data, expected)
            unfetch({ url }, 'someid')
            s2.remove().then(() => {
              done()
            })
          }
        })
      })
    })
  })

  it('fetch -> unfetch', (done) => {
    fetch({ url }, { path: { equals: '33' } }, 'someid')((action) => {
      if (action.type === 'JET_FETCHER_SUCCESS') {
        const action = unfetch({ url }, 'someid')
        assert.strictEqual(action.url, url)
        assert.strictEqual(action.type, 'JET_UNFETCH')
        assert.strictEqual(action.id, 'someid')
        done()
      }
    })
  })

  it('unfetch', () => {
    const action = unfetch({ url }, 'someid')
    assert.strictEqual(action.url, url)
    assert.strictEqual(action.type, 'JET_UNFETCH')
    assert.strictEqual(action.id, 'someid')
  })

  describe('addMethod', () => {
    it('ok', done => {
      let i = 0
      addMethod({ url }, 'foo/bar/method', () => {})((action) => {
        if (i === 0) {
          assert.strictEqual(action.type, 'JET_ADD_REQUEST')
          assert.strictEqual(action.path, 'foo/bar/method')
          assert.strictEqual(action.kind, 'method')
        } else if (i === 1) {
          assert.strictEqual(action.type, 'JET_ADD_SUCCESS')
          assert.strictEqual(action.path, 'foo/bar/method')
          assert.strictEqual(action.kind, 'method')
          done()
        }
        ++i
      })
    })
  })

  describe('addState', () => {
    it('ok', done => {
      let i = 0
      addState({ url }, 'foo/bar/state', 123, () => {})((action) => {
        if (i === 0) {
          assert.strictEqual(action.type, 'JET_ADD_REQUEST')
          assert.strictEqual(action.path, 'foo/bar/state')
          assert.strictEqual(action.kind, 'state')
        } else if (i === 1) {
          assert.strictEqual(action.type, 'JET_ADD_SUCCESS')
          assert.strictEqual(action.path, 'foo/bar/state')
          assert.strictEqual(action.kind, 'state')
          done()
        }
        ++i
      })
    })

    it('propagates error', done => {
      let i = 0
      addState({ url }, 'foo/bar/state2', 123, () => {})(() => {})
      addState({ url }, 'foo/bar/state2', 123, () => {})((action) => {
        if (i === 0) {
          assert.strictEqual(action.type, 'JET_ADD_REQUEST')
          assert.strictEqual(action.path, 'foo/bar/state2')
          assert.strictEqual(action.kind, 'state')
        } else if (i === 1) {
          assert.strictEqual(action.type, 'JET_ADD_FAILURE')
          assert.strictEqual(action.path, 'foo/bar/state2')
          assert(action.error)
          done()
        }
        ++i
      })
    })
  })

  describe('remove', () => {
    before(done => {
      addMethod({ url }, 'foo/bar/removethis', () => {})(action => {
        if (action.type === 'JET_ADD_SUCCESS') {
          done()
        }
      })
    })

    it('works', done => {
      let i = 0
      remove({ url }, 'foo/bar/removethis')(action => {
        if (i === 0) {
          assert.strictEqual(action.type, 'JET_REMOVE_REQUEST')
          assert.strictEqual(action.path, 'foo/bar/removethis')
        } else if (i === 1) {
          assert.strictEqual(action.type, 'JET_REMOVE_SUCCESS')
          assert.strictEqual(action.path, 'foo/bar/removethis')
          done()
        }
        ++i
      })
    })

    it('propagates error', done => {
      let i = 0
      remove({ url }, 'foo/bar/notthere')(action => {
        if (i === 0) {
          assert.strictEqual(action.type, 'JET_REMOVE_REQUEST')
          assert.strictEqual(action.path, 'foo/bar/notthere')
        } else if (i === 1) {
          assert.strictEqual(action.type, 'JET_REMOVE_FAILURE')
          assert.strictEqual(action.path, 'foo/bar/notthere')
          assert(action.error)
          done()
        }
        ++i
      })
    })
  })

  describe('change', () => {
    before(done => {
      addState({ url }, 'foo/bar/changer', 33)(action => {
        if (action.type === 'JET_ADD_SUCCESS') {
          done()
        }
      })
    })

    it('works', done => {
      let i = 0
      change({ url }, 'foo/bar/changer')(action => {
        if (i === 0) {
          assert.strictEqual(action.type, 'JET_CHANGE_REQUEST')
          assert.strictEqual(action.path, 'foo/bar/changer')
        } else if (i === 1) {
          assert.strictEqual(action.type, 'JET_CHANGE_SUCCESS')
          assert.strictEqual(action.path, 'foo/bar/changer')
          done()
        }
        ++i
      })
    })

    it('propagates error', done => {
      let i = 0
      change({ url }, 'foo/bar/notthere')(action => {
        if (i === 0) {
          assert.strictEqual(action.type, 'JET_CHANGE_REQUEST')
          assert.strictEqual(action.path, 'foo/bar/notthere')
        } else if (i === 1) {
          assert.strictEqual(action.type, 'JET_CHANGE_FAILURE')
          assert.strictEqual(action.path, 'foo/bar/notthere')
          assert(action.error)
          done()
        }
        ++i
      })
    })
  })
})
