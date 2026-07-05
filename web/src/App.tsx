import './App.css'

const REPO_URL = 'https://github.com/Tejs1/Snaggit'
const DOWNLOAD_URL = '/snaggit-extension.zip'

const FEATURES = [
  'Select text on any page and click the "Save Highlight?" bubble, or right-click a selection.',
  'Keyboard selections (Cmd/Ctrl+A, Shift+arrows) trigger the save bubble too.',
  'View, delete, or summarize saved highlights from the toolbar popup.',
  'Summaries run through OpenAI using your own API key, set in Settings.',
  'Open the full-page highlights view for more room.',
]

const INSTALL_STEPS = [
  'Click Download below and unzip the file.',
  'Open chrome://extensions in Chrome.',
  'Enable Developer mode (top right).',
  'Click Load unpacked and select the unzipped folder.',
]

export default function App() {
  return (
    <div className="app">
      <header className="hero">
        <h1>Snaggit</h1>
        <p className="tagline">Save text highlights from any page and summarize them with AI.</p>
        <div className="cta-row">
          <a className="button button--primary" href={DOWNLOAD_URL} download>
            Download for Chrome
          </a>
          <a className="button button--secondary" href={REPO_URL} target="_blank" rel="noreferrer">
            View on GitHub
          </a>
        </div>
      </header>

      <section className="section">
        <h2>What it does</h2>
        <ul>
          {FEATURES.map((feature) => (
            <li key={feature}>{feature}</li>
          ))}
        </ul>
      </section>

      <section className="section">
        <h2>Install</h2>
        <ol>
          {INSTALL_STEPS.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </section>
    </div>
  )
}
