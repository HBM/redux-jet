/* globals describe it before afterEach */
import assert from 'assert'
import { connect, close, set, call, fetch, unfetch, get, addState, addMethod, remove, change } from '../src/actions'
import { Daemon, Peer, State, Method } from 'node-jet'

const url = 'ws://localhost:11123'

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
      close({url})
    })

    it('ok', (done) => {
      let i = 0
      connect({url})((action) => {
        if (i === 0) {
          assert.deepEqual(action, {
            type: 'JET_CONNECT_REQUEST',
            url,
            password: undefined,
            user: undefined
          })
          ++i
        } else {
          assert.deepEqual(action, {
            type: 'JET_CONNECT_SUCCESS',
            url,
            password: undefined,
            user: undefined
          })
          done()
        }
      })
    })

    it('with debug', (done) => {
      let i = 0
      connect({url}, true)((action) => {
        if (action.type !== 'JET_DEBUG') {
          return
        }
        if (i === 0) {
          assert.equal(action.direction, 'out')
          assert.equal(typeof action.string, 'string')
          assert.doesNotThrow(() => new Date(action.timestamp))
          assert.equal(typeof action.json, 'object')
          ++i
        } else if (i === 1) {
          assert.equal(action.direction, 'in')
          assert.equal(typeof action.string, 'string')
          assert.doesNotThrow(() => new Date(action.timestamp))
          assert.equal(typeof action.json, 'object')
          done()
        }
      })
    })

    it('twice (fast)', done => {
      const noop = () => {}
      close({url})
      connect({url})(noop)
      connect({url})(action => {
        if (action.type === 'JET_CONNECT_SUCCESS') {
          done()
        }
      })
    })

    it('fail', (done) => {
      let i = 0
      connect({url: 'ws://foo.bar:11123'})((action) => {
        if (i === 0) {
          assert.deepEqual(action, {
            type: 'JET_CONNECT_REQUEST',
            url: 'ws://foo.bar:11123',
            password: undefined,
            user: undefined
          })
          ++i
        } else if (i === 1) {
          const {type, url, error} = action
          assert.equal(type, 'JET_CONNECT_FAILURE')
          assert.equal(url, 'ws://foo.bar:11123')
          assert(error)
          done()
        }
      })
    })
  })

  it('connect (wait) -> close', (done) => {
    connect({url})((action) => {
      if (action.type === 'JET_CONNECT_SUCCESS') {
        close({url})
      }
      if (action.type === 'JET_CLOSED') {
        done()
      }
    })
  })

  it('connect -> close', (done) => {
    connect({url})((action) => {
      if (action.type === 'JET_CONNECT_FAILURE') {
        done()
      }
    })
    close({url})
  })

  it('connect (wait) -> close(force)', (done) => {
    let unexpectedAction
    connect({url})((action) => {
      if (action.type === 'JET_CONNECT_SUCCESS') {
        close({url}, true)
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
    connect({url})((action) => {
      if (action.type !== 'JET_CONNECT_FAILURE' && action.type !== 'JET_CONNECT_REQUEST') {
        unexpectedAction = true
      }
    })
    close({url}, true)
    setTimeout(() => {
      assert(!unexpectedAction)
      done()
    }, 100)
  })

  it('close', () => {
    const action = close({url: 'ws://localhost.bar:123'})
    assert.equal(action.type, 'JET_CLOSE')
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

      set({url}, 'abc', 123)((action) => {
        if (i === 0) {
          const {path, value, id, type} = action
          assert.equal(type, 'JET_SET_REQUEST')
          assert.equal(path, 'abc')
          assert.equal(value, 123)
          assert(id)
          ++i
        } else {
          const {path, value, id, type} = action
          assert.equal(type, 'JET_SET_SUCCESS')
          assert.equal(path, 'abc')
          assert.equal(value, 123)
          assert(id)
          assert.equal(newVal, 123)
          done()
        }
      })
    })

    it('fail', (done) => {
      let i = 0
      set({url}, 'abc2', 123)((action) => {
        if (i === 0) {
          const {path, value, id, type} = action
          assert.equal(type, 'JET_SET_REQUEST')
          assert.equal(path, 'abc2')
          assert.equal(value, 123)
          assert(id)
          ++i
        } else {
          const {path, id, type, error} = action
          assert.equal(type, 'JET_SET_FAILURE')
          assert.equal(path, 'abc2')
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

      call({url}, 'def', [1, 2])((action) => {
        if (i === 0) {
          const {path, args, id, type} = action
          assert.equal(type, 'JET_CALL_REQUEST')
          assert.equal(path, 'def')
          assert.deepEqual(args, [1, 2])
          assert(id)
          ++i
        } else {
          const {path, result, id, type} = action
          assert.equal(type, 'JET_CALL_SUCCESS')
          assert.equal(path, 'def')
          assert.equal(result, 3)
          assert(id)
          assert.deepEqual(args, [1, 2])
          done()
        }
      })
    })

    it('fail', (done) => {
      let i = 0
      call({url}, 'abc2', [1, 2])((action) => {
        if (i === 0) {
          const {path, args, id, type} = action
          assert.equal(type, 'JET_CALL_REQUEST')
          assert.equal(path, 'abc2')
          assert.deepEqual(args, [1, 2])
          assert(id)
          ++i
        } else {
          const {path, id, type, error} = action
          assert.equal(type, 'JET_CALL_FAILURE')
          assert.equal(path, 'abc2')
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
      get({url}, fexpression, 'someid')((action) => {
        if (i === 0) {
          const {expression, id, type} = action
          assert.equal(type, 'JET_GET_REQUEST')
          assert.deepEqual(expression, fexpression)
          assert.equal(id, 'someid')
          ++i
        } else {
          assert.equal(action.type, 'JET_GET_SUCCESS')
          assert.deepEqual(action.expression.path, fexpression.path)
          assert.equal(action.result[0].event, 'add')
          assert.equal(action.result[0].path, 'yyy')
          assert.equal(action.result[0].value, 444)
          assert.equal(action.id, 'someid')
          done()
        }
      })
    })

    it('fail', (done) => {
      let i = 0
      const fexpression = 123
      get({url}, fexpression, 'someid')((action) => {
        if (i === 0) {
          const {expression, id, type} = action
          assert.equal(type, 'JET_GET_REQUEST')
          assert.deepEqual(expression, fexpression)
          assert.equal(id, 'someid')
          ++i
        } else {
          assert.equal(action.type, 'JET_GET_FAILURE')
          assert.deepEqual(action.expression, fexpression)
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
      fetch({url}, fexpression, 'someid')((action) => {
        if (i === 0) {
          const {expression, id, type} = action
          assert.equal(type, 'JET_FETCHER_REQUEST')
          assert.deepEqual(expression, fexpression)
          assert.equal(id, 'someid')
          ++i
        } else if (i === 1) {
          const {expression, id, type} = action
          assert.equal(type, 'JET_FETCHER_SUCCESS')
          assert.deepEqual(expression, fexpression)
          assert.equal(id, 'someid')
          ++i
        } else {
          assert.equal(action.type, 'JET_FETCHER_DATA')
          assert.deepEqual(action.expression.path, fexpression.path)
          assert.equal(action.data[0].event, 'add')
          assert.equal(action.data[0].path, 'ppp')
          assert.equal(action.data[0].value, 444)
          assert.equal(action.id, 'someid')
          unfetch({url}, 'someid')
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
      fetch({url}, {path: {equals: '33'}}, 'someid')(() => {})
      fetch({url}, fexpression, 'someid')((action) => {
        if (i === 0) {
          const {expression, id, type} = action
          assert.equal(type, 'JET_FETCHER_REQUEST')
          assert.deepEqual(expression, fexpression)
          assert.equal(id, 'someid')
          ++i
        } else if (i === 1) {
          const {expression, id, type} = action
          assert.equal(type, 'JET_FETCHER_SUCCESS')
          assert.deepEqual(expression, fexpression)
          assert.equal(id, 'someid')
          ++i
        } else {
          assert.equal(action.type, 'JET_FETCHER_DATA')
          assert.deepEqual(action.expression.path, fexpression.path)
          assert.equal(action.data[0].event, 'add')
          assert.equal(action.data[0].path, 'ppp')
          assert.equal(action.data[0].value, 444)
          assert.equal(action.id, 'someid')
          unfetch({url}, 'someid')
          done()
        }
      })
    })

    it('fail', (done) => {
      let i = 0
      fetch({url}, 1, 'someid')((action) => {
        if (i === 0) {
          const {expression, id, type} = action
          assert.equal(type, 'JET_FETCHER_REQUEST')
          assert.equal(expression, 1)
          assert.equal(id, 'someid')
          ++i
        } else if (i === 1) {
          const {expression, id, type, error} = action
          assert.equal(type, 'JET_FETCHER_FAILURE')
          assert.equal(expression, 1)
          assert.equal(id, 'someid')
          assert(error)
          unfetch({url}, 'someid')
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
        fetch({url}, expression, 'someid')((action) => {
          if (i === 0) {
            assert.equal(action.type, 'JET_FETCHER_REQUEST')
            ++i
          } else if (i === 1) {
            assert.equal(action.type, 'JET_FETCHER_SUCCESS')
            ++i
          } else if (i === 2) {
            assert.equal(action.type, 'JET_FETCHER_DATA')
            const expected = [
              [
                { path: 'ppp', value: 444, fetchOnly: true, index: 1 },
                { path: 'ppp2', value: 3, fetchOnly: true, index: 2 }
              ],
              2
            ]
            assert.deepEqual(action.data, expected)
            s2.value(6666)
            ++i
          } else if (i === 3) {
            assert.equal(action.type, 'JET_FETCHER_DATA')
            const expected = [
              [
                { path: 'ppp2', value: 6666, fetchOnly: true, index: 2 }
              ],
              2
            ]
            assert.deepEqual(action.data, expected)
            unfetch({url}, 'someid')
            s2.remove().then(() => {
              done()
            })
          }
        })
      })
    })
  })

  it('fetch -> unfetch', (done) => {
    fetch({url}, {path: {equals: '33'}}, 'someid')((action) => {
      if (action.type === 'JET_FETCHER_SUCCESS') {
        const action = unfetch({url}, 'someid')
        assert.equal(action.url, url)
        assert.equal(action.type, 'JET_UNFETCH')
        assert.equal(action.id, 'someid')
        done()
      }
    })
  })

  it('unfetch', () => {
    const action = unfetch({url}, 'someid')
    assert.equal(action.url, url)
    assert.equal(action.type, 'JET_UNFETCH')
    assert.equal(action.id, 'someid')
  })

  describe('addMethod', () => {
    it('ok', done => {
      let i = 0
      addMethod({url}, 'foo/bar/method', () => {})((action) => {
        if (i === 0) {
          assert.equal(action.type, 'JET_ADD_REQUEST')
          assert.equal(action.path, 'foo/bar/method')
          assert.equal(action.kind, 'method')
        } else if (i === 1) {
          assert.equal(action.type, 'JET_ADD_SUCCESS')
          assert.equal(action.path, 'foo/bar/method')
          assert.equal(action.kind, 'method')
          done()
        }
        ++i
      })
    })
  })

  describe('addState', () => {
    it('ok', done => {
      let i = 0
      addState({url}, 'foo/bar/state', 123, () => {})((action) => {
        if (i === 0) {
          assert.equal(action.type, 'JET_ADD_REQUEST')
          assert.equal(action.path, 'foo/bar/state')
          assert.equal(action.kind, 'state')
        } else if (i === 1) {
          assert.equal(action.type, 'JET_ADD_SUCCESS')
          assert.equal(action.path, 'foo/bar/state')
          assert.equal(action.kind, 'state')
          done()
        }
        ++i
      })
    })

    it('propagates error', done => {
      let i = 0
      addState({url}, 'foo/bar/state2', 123, () => {})(() => {})
      addState({url}, 'foo/bar/state2', 123, () => {})((action) => {
        if (i === 0) {
          assert.equal(action.type, 'JET_ADD_REQUEST')
          assert.equal(action.path, 'foo/bar/state2')
          assert.equal(action.kind, 'state')
        } else if (i === 1) {
          assert.equal(action.type, 'JET_ADD_FAILURE')
          assert.equal(action.path, 'foo/bar/state2')
          assert(action.error)
          done()
        }
        ++i
      })
    })
  })

  describe('remove', () => {
    before(done => {
      addMethod({url}, 'foo/bar/removethis', () => {})(action => {
        if (action.type === 'JET_ADD_SUCCESS') {
          done()
        }
      })
    })

    it('works', done => {
      let i = 0
      remove({url}, 'foo/bar/removethis')(action => {
        if (i === 0) {
          assert.equal(action.type, 'JET_REMOVE_REQUEST')
          assert.equal(action.path, 'foo/bar/removethis')
        } else if (i === 1) {
          assert.equal(action.type, 'JET_REMOVE_SUCCESS')
          assert.equal(action.path, 'foo/bar/removethis')
          done()
        }
        ++i
      })
    })

    it('propagates error', done => {
      let i = 0
      remove({url}, 'foo/bar/notthere')(action => {
        if (i === 0) {
          assert.equal(action.type, 'JET_REMOVE_REQUEST')
          assert.equal(action.path, 'foo/bar/notthere')
        } else if (i === 1) {
          assert.equal(action.type, 'JET_REMOVE_FAILURE')
          assert.equal(action.path, 'foo/bar/notthere')
          assert(action.error)
          done()
        }
        ++i
      })
    })
  })

  describe('change', () => {
    before(done => {
      addState({url}, 'foo/bar/changer', 33)(action => {
        if (action.type === 'JET_ADD_SUCCESS') {
          done()
        }
      })
    })

    it('works', done => {
      let i = 0
      change({url}, 'foo/bar/changer')(action => {
        if (i === 0) {
          assert.equal(action.type, 'JET_CHANGE_REQUEST')
          assert.equal(action.path, 'foo/bar/changer')
        } else if (i === 1) {
          assert.equal(action.type, 'JET_CHANGE_SUCCESS')
          assert.equal(action.path, 'foo/bar/changer')
          done()
        }
        ++i
      })
    })

    it('propagates error', done => {
      let i = 0
      change({url}, 'foo/bar/notthere')(action => {
        if (i === 0) {
          assert.equal(action.type, 'JET_CHANGE_REQUEST')
          assert.equal(action.path, 'foo/bar/notthere')
        } else if (i === 1) {
          assert.equal(action.type, 'JET_CHANGE_FAILURE')
          assert.equal(action.path, 'foo/bar/notthere')
          assert(action.error)
          done()
        }
        ++i
      })
    })
  })
})
