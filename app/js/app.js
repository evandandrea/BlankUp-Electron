const fs = require('fs')
const path = require('path')
const ipc = require('electron').ipcRenderer
const choo = require('choo')
const html = require('choo/html')
const app = choo({
    onStateChange(action, state, prev, caller, createSend) {
        console.log('newState\n', state)
    },
    onAction(action, state, name, caller, createSend) {
        console.log(`action ${name}\n`, action)
    }
})

const generateId = () => {
    return (Date.now() + Math.random().toString(36).substr(2, 9)).toUpperCase()
}

/**
 *   Create a new editor. Optionally set some parameters.
 *   @param  {Object} infos - Set parameters on the new editor.
 *   @return {Obejct}       - A new editor.
 */
function createNewEditor(infos) {
    const newEditor = {
        active: infos.active || false,
        changed: false,
        filePath: infos.filePath || null,
        name: infos.name || 'untitled',
        id: generateId(),
		preview: infos.preview || false
    }
    let div = document.createElement('div')
    div.style.height = '100%'
    document.body.appendChild(div)
    newEditor.BlankUp = BlankUp(div)
    newEditor.BlankUp.setMarkdown(infos.markdown || '')
    newEditor.BlankUp.on('change', (event) => {
		console.debug('changes', newEditor.filePath, event)
        document.body.dispatchEvent(new CustomEvent('editorChanged', {
            detail: {
                id: newEditor.id
            }
        }))
    })
    newEditor.editor = div
    document.body.removeChild(div)
    return newEditor
}

const reducers = require('./js/reducers')
const effects = require('./js/effects')
const subscriptions = require('./js/subscriptions')

app.model({
    state: {
        editors: [],
		hints: [
			'Drag + Drop a Markdown file here to start',
			'Press Ctrl+M to toggle the preview',
			'Get to the next open file using Ctrl+Tab'
		]
    },
    reducers,
	effects,
    subscriptions
})

const mainView = (state, prev, send) => html `
  <main>
  	<nav class="editor-nav" style=${state.editors.length === 0 ? 'display: none;' : ""}>
		<ul>
			${state.editors.map(editor => html`<li
				class="editor-nav__tab ${editor.active ? 'editor-nav__tab_active' : ''} ${editor.changed ? 'editor-nav__tab_changed' : ''}"
				data-editor-id="${editor.id}"
				onclick=${(e) => {
						if(/editor-nav__tab-close-icon/g.test(e.target.className)) return
						send('activateEditor', editor.id, () => {})
					}}>
					<i class="fa fa-circle-o editor-nav__tab-change-icon"></i>
					${editor.name.length <= 19 ? editor.name : editor.name.substr(0,16) + '...'}
					<i class="fa fa-close editor-nav__tab-close-icon"
						onclick=${(e) => {
							send('closeEditor', editor.id, () => {})
						}}>
					</i>
				</li>`)}
		</ul>
	</nav>
	${state.editors.length === 0 ? html`<div class="no-editor-placeholder">
			<img class="no-editor-placeholder__image" src="img/BlankUpSymbolBW.png" /><br />
			<span class="no-editor-placeholder__text">${state.hints[Math.floor(Math.random()*state.hints.length)]}</span>
		</div>` : ''
	}
  </main>
`

app.router((route) => [
    route('/', mainView)
])

const tree = app.start()
document.getElementById('app').appendChild(tree)

//Make it so that clicking below the editors actually gets a user into it.
const container = document.querySelector('#editorContainer')
container.addEventListener('click', (e) => {
	if(e.target.id !== 'editorContainer') return
	const editor = document.querySelector('textarea')
	if(editor) {
		document.body.dispatchEvent(new CustomEvent('focusCurrentEditor', {
            detail: {}
        }))
	}
})
