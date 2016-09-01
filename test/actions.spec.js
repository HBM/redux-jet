/* globals describe it before */
import assert from 'assert'
import { connect } from '../lib/actions'
import { Daemon, Peer } from 'node-jet'

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
      connect({url: 'ws://localhost:11123'})((action) => {
        if (i === 0) {
          assert.deepEqual(action, {
            type: 'JET_CONNECT_REQUEST',
            url: 'ws://localhost:11123',
            password: undefined,
            user: undefined
          })
          ++i
        } else {
          assert.deepEqual(action, {
            type: 'JET_CONNECT_SUCCESS',
            url: 'ws://localhost:11123',
            password: undefined,
            user: undefined
          })
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
})
