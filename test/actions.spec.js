/* globals describe it before */
import assert from 'assert'
import { connect, close, set, call, fetch } from '../lib/actions'
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

    it('twice (fast)', () => {
      const noop = () => {}
      close({url})
      connect({url})(noop)
      return connect({url})(noop)
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
        } else {
          const {type, url, error} = action
          assert.equal(type, 'JET_CONNECT_FAILURE')
          assert.equal(url, 'ws://foo.bar:11123')
          assert(error)
          done()
        }
      })
    })
  })

  it('close', (done) => {
    connect({url})((action) => {
      if (action.type === 'JET_CONNECT_SUCCESS') {
        close({url})
        done()
      }
    })
    // TODO: no way to tell this was ok
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
      fetch({url}, fexpression , 'someid')((action) => {
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
          console.log(action)
          assert.equal(action.type, 'JET_FETCHER_CONTENT_CHANGE')
          assert.deepEqual(action.expression.path, fexpression.path)
          assert.equal(action.event, 'add')
          assert.equal(action.path, 'ppp')
          assert.equal(action.value, 444)
          assert.equal(action.id, 'someid')
          done()
        }
      })
    })
  })
})
