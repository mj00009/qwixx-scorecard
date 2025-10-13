iimport React, { useState, useEffect, useMemo } from 'react'
import styled, { createGlobalStyle } from 'styled-components/macro'
import { produce } from 'immer'
import { startRows, startMissed } from './startData'
import FieldRow, { FieldRowGrid } from './FieldRow'
import { save, load } from './localStorage'
import Result from './Result'
import Missed from './Missed'
import Navigation from './Navigation'

const GlobalStyle = createGlobalStyle`
  :root {
    --bg-light: #f5f6fa;
    --bg-dark: #0d1117;
    --glass-light: rgba(255, 255, 255, 0.7);
    --glass-dark: rgba(20, 20, 20, 0.6);
    --text-light: #111;
    --text-dark: #eee;
    --blur-amount: 20px;
    --border-light: rgba(0, 0, 0, 0.1);
    --border-dark: rgba(255, 255, 255, 0.1);
  }

  html, body, #root {
    height: 100%;
    margin: 0;
    padding: 0;
    font-family: system-ui, sans-serif;
    background: var(--bg-light);
    color: var(--text-light);
    transition: background 0.4s ease, color 0.4s ease;
  }

  @media (prefers-color-scheme: dark) {
    body {
      background: var(--bg-dark);
      color: var(--text-dark);
    }
  }

  * {
    box-sizing: border-box;
  }
`

export default function App() {
  const [history, setHistory] = useState(load('qwixx-history') || null)
  const [rows, setRows] = useState(load('qwixx-rows') || startRows)
  const [missed, setMissed] = useState(load('qwixx-missed') || startMissed)
  const [forceGameOver, setForceGameOver] = useState(
    load('qwixx-gameover') || false
  )

  const isGameOver = useMemo(
    () =>
      forceGameOver ||
      missed.every((field) => field.checked) ||
      rows.reduce((acc, row) => (row.isLocked ? acc + 1 : acc), 0) === 2,
    [rows, missed, forceGameOver]
  )

  useEffect(() => {
    save('qwixx-history', history)
    save('qwixx-rows', rows)
    save('qwixx-missed', missed)
    save('qwixx-gameover', forceGameOver)
  }, [history, rows, missed, forceGameOver])

  return (
    <>
      <GlobalStyle />
      <Wrapper>
        <Content>
          {rows.map((row, rowIndex) => (
            <FieldRow
              key={row.name}
              row={row}
              rowIndex={rowIndex}
              onFieldClick={onFieldClick}
            />
          ))}
          <FieldRowGrid>
            <div style={{ display: 'flex', gridColumn: 'span 8', alignItems: 'center' }}>
              {isGameOver && <Result rows={rows} missed={missed} />}
            </div>
            <div style={{ gridColumn: 'span 4' }}>
              <Missed missed={missed} onMissed={handleMissed} />
            </div>
          </FieldRowGrid>
        </Content>
        <Navigation
          isGameOver={isGameOver}
          history={history}
          reset={reset}
          finish={finish}
          undo={undo}
        />
      </Wrapper>
    </>
  )

  function handleMissed(index) {
    setHistory({ rows, missed })
    setMissed(
      produce(missed, (draft) => {
        draft[index].checked = true
      })
    )
  }

  function finish() {
    if (window.confirm('End game?')) {
      setForceGameOver(true)
      setHistory(null)
    }
  }

  function reset() {
    if (window.confirm('You really want to start a new game?')) {
      setHistory(null)
      setRows(startRows)
      setMissed(startMissed)
      setForceGameOver(false)
    }
  }

  function undo() {
    setRows(history.rows)
    setMissed(history.missed)
    setHistory(null)
  }

  function lockRow(rowIndex) {
    setHistory({ rows, missed })
    setRows(
      produce(rows, (rowsDraft) => {
        rowsDraft[rowIndex].isLocked = true
      })
    )
  }

  function onFieldClick(rowIndex, boxIndex) {
    if (isGameOver || forceGameOver) return

    const isLock = boxIndex === 11
    if (isLock) return lockRow(rowIndex)

    const is12AndAllowed =
      boxIndex === 10 &&
      rows[rowIndex].boxes.reduce((acc, box) => (box.checked ? acc + 1 : acc), 0) >= 5

    setHistory({ rows, missed })

    is12AndAllowed
      ? setRows(
          produce(rows, (rowsDraft) => {
            const row = rowsDraft[rowIndex]
            row.isLocked = true
            const boxes = row.boxes
            boxes[boxIndex].checked = true
            boxes[boxIndex + 1].checked = true
          })
        )
      : setRows(
          boxIndex === 10
            ? rows
            : produce(rows, (rowsDraft) => {
                const boxes = rowsDraft[rowIndex].boxes
                boxes[boxIndex].checked = true
              })
        )
  }
}

const Wrapper = styled.main`
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: 100%;
  min-height: 100vh;
  padding: 1rem;
  backdrop-filter: blur(var(--blur-amount));
  background: var(--glass-light);
  border: 1px solid var(--border-light);
  border-radius: 20px;
  margin: auto;
  max-width: 900px;
  width: 95%;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  transition: background 0.4s ease, border 0.4s ease, box-shadow 0.4s ease;

  @media (prefers-color-scheme: dark) {
    background: var(--glass-dark);
    border: 1px solid var(--border-dark);
    box-shadow: 0 8px 40px rgba(0, 0, 0, 0.6);
  }
`

const Content = styled.div`
  display: grid;
  gap: 8px;
  width: 100%;
  overflow: auto;
  flex: 1;
  padding-bottom: 1rem;

  @media (max-width: 600px) {
    gap: 4px;
  }
`
