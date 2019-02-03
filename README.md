<p align="center"><img src="./build/icon.png" height="64" alt="WIP Logo"></p>
<h3 align="center">WIP</h3>
<p align="center">🚧 WIP menubar app<p>
<p align="center">
    <a href="https://github.com/marckohlbrugge/wip-menubar/releases"><img src="https://img.shields.io/github/downloads/marckohlbrugge/wip-menubar/total.svg" alt="GitHub Downloads"></a>
    <a href="https://github.com/marckohlbrugge/wip-menubar/releases"><img src="https://img.shields.io/github/release/marckohlbrugge/wip-menubar.svg" alt="Current Release Version"></a>
    <a href="https://github.com/marckohlbrugge/readme-template/blob/master/LICENSE.md"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License"></a>
    <a href="https://github.com/prettier/prettier"><img src="https://img.shields.io/badge/code_style-prettier-ff69b4.svg" alt="Prettier Code Style"></a>
</p>

## Installation

Download the latest version of WIP from the **[GitHub releases](https://github.com/marckohlbrugge/wip-menubar/releases)** page. (macOS, Windows, and Linux)

## Features

- Quickly create a todo with a system-wide shortcut: <kbd>control</kbd> + <kbd>space</kbd>
- See your current streak & best streak
- Notification when you haven't shipped today
- See time left to keep your streak
- Launch at login
- Jump to your product pages

## Screenshots

### Menubar

<img src="./screenshots/menubar.png" width="325" alt="Menubar Screenshot">

### Add a Completed Todo

<img src="./screenshots/done.png" width="713" alt="Completed Todo Screenshot">

### Add a Pending Todo

<img src="./screenshots/todo.png" width="713" alt="Pending Todo Screenshot">

### Preferences

<img src="./screenshots/preferences.png" width="399" alt="Preferences Screenshot">

## Menu Bar Icons

WIP's menu bar icon is updated depending on your current streak status:

|                                                              | Status  | Description                                           |
| ------------------------------------------------------------ | ------- | ----------------------------------------------------- |
| <img src="./src/icons/macos/doneTemplate@2x.png" width="16"> | Done    | You've shipped today                                  |
| <img src="./src/icons/macos/todoTemplate@2x.png" width="16"> | Todo    | You haven't shipped today                             |
| <img src="./src/icons/macos/loadTemplate@2x.png" width="16"> | Loading | Your streak data is being requested from WIP          |
| <img src="./src/icons/macos/failTemplate@2x.png" width="16"> | Failed  | Your streak data request failed                       |


## Development

- `yarn start` to run the app.
- `yarn dist` to build apps for distribution.

## Credits

This app is almost a 1:1 copy of [streaker](https://github.com/jamieweavis/streaker) by [Jamie Weavis](https://github.com/jamieweavis). Major props to him for open sourcing his work.

## Copyright

© 2019 Marc Köhlbrugge

Menubar for WIP is [source-available](https://en.wikipedia.org/wiki/Source-available_software) software. ([license](LICENSE.md))
