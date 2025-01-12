/**
 * menu/script.js
 *
 * Plain vanilla script to:
 * - Populate and control a menu which slides out when its
 *   hamburger icon is clicked
 * - Control a footer with #previous and #next buttons
 * - Remember scroll position for each section
 * - Jump to the right section when browser search is used
 */

const storage  = new Storage()

const main     = document.getElementById("main")
const menu     = document.getElementById("menu")
const icon     = document.getElementById("menu-icon")
const list     = document.getElementById("menu-items")
const sections = Array.from(document.querySelectorAll("section"))
const foot     = document.getElementById("footer")
const prev     = document.getElementById("previous")
const prevName = document.getElementById("previous-name")
const next     = document.getElementById("next")
const nextName = document.getElementById("next-name")
const toCredit = document.querySelectorAll("img[data-credits]")

const CREDIT_REGEX = /\[([^\]]+)\]\(([^\)]+)\)/g
const linkLength = 32 // number of chars when startOfText is used


// CUSTOMIZE THIS FUNCTION WHICH IS CALLED BY getVisibleBlocks //
const ignoreElement = element => {
  const tagsToIgnore = [ "SECTION" ]
  return tagsToIgnore.indexOf(element.tagName) > -1
}


let menuIsOpen = true   // could read from localStorage
const closeDelay = 2000 // ms
const endFudge = 10     // pixels from bottom when scrolled to end
const sectionIds = []
const sectionNames = []
const menuItems = []
let hash = ""
// Remember the scroll-top of each section
let tops = storage.getItem("tops") || {}
let activeItem
let noHash    // id of section:last-child
let blocks    // array of visible elements in main, sorted by top
let selectMap // helps scroll to selection on page change


// Generate Menu entries from section headers
const lastIndex = sections.length - 1
sections.forEach(( section, index ) => {
  const { id } = section
  if (id) {
    const header = section.firstElementChild
    const sectionName = section.dataset.item || getStartOfText(header)

    if (!(id in tops)) {
      // This section has just been added
      tops[id] = 0
    }

    // Create an li wrapping a link for each section with an id
    const li = document.createElement("li")
    li.setAttribute("id", `menu-item-${id}`)
    const a = document.createElement("a")
    a.setAttribute("href", `#${id}`)
    a.setAttribute("draggable", false)

    a.textContent = sectionName
    li.append(a)

    if (index === lastIndex) {
      // The last child should appear with no hash/target,
      // and should appear first in the menu
      // a.setAttribute("href", `/`)
      list.prepend(li)

      noHash = id
      sectionIds.unshift(id)
      sectionNames.unshift(sectionName)

    } else {
      list.append(li)
      sectionIds.push(id)
      sectionNames.push(sectionName)
    }

    menuItems.push(li)
  }
})


// Create an array of all visible elements
function isVisible(node) {
  const { width, height } = node.getBoundingClientRect()
  return !!width || !!height
}

function getVisibleBlocks() {
  let all = [];

  function getDescendants(node) {
    for (var i = 0; i < node.children.length; i++) {
      var child = node.children[i];

      if (isVisible(child)) {
        getDescendants(child);
        if (!ignoreElement(child)) {
          all.push(child);
        }
      }
    }
  }

  function byTop(a, b) {
    const { top: aTop } = a.getBoundingClientRect()
    const { top: bTop } = b.getBoundingClientRect()
    return aTop - bTop
  }

  getDescendants(main);

  all = all.sort(byTop)

  return all
}



// Scroll to the last position shown for the chosen page
window.addEventListener("hashchange", hashChange)

function hashChange() {
  // The hash change will show the associated section, and place
  // the section at the top of the viewport.
  hash = (location.hash || noHash || "").replace("#", "")

  // Update the section names in the footer
  setPreviousAndNext(hash)

  // Hilite the associated button in the menu
  setTargetClassInMenu(hash)

  // Update the list of block elements that are now visible
  blocks = getVisibleBlocks()

  if (document.querySelector("#scroll:checked")) {
    // The article is not split into pages. Let the browser
    // behave as usual.
    return
  }

  // Scroll all the way to the top (to show the header)...
  main.scrollTo({ top: 0 })

  // Find the element that was straddling/at the top the last
  // time the user visited this page...
  const topMeasure = tops[hash]
  const topIndex = parseInt(topMeasure)
  const topElement = blocks[topIndex]

  if (!topElement) {
    // ... unless the user entered an invalid hash in the
    // browser address bar...
    return
  }

  // ... and scroll so that the same amount straddles the top
  // of the page now
  const fraction = topMeasure - topIndex // part that's invisible
  let { top, height } = topElement.getBoundingClientRect()

  if (fraction) {
    top += fraction * height
  }

  // ... and scroll the page to show it
  main.scrollTo({ top })
}

function setPreviousAndNext(hash) {
  const index = sectionIds.indexOf(hash)
  const isLast = (index === sectionIds.length - 1)

  if (index) {
    prev.removeAttribute("disabled")
    prevName.textContent = sectionNames[index - 1]
  } else {
    prev.setAttribute("disabled", true)
    prevName.textContent = ""
  }

  if (isLast) {
    next.setAttribute("disabled", true)
    nextName.textContent = ""
  } else {
    next.removeAttribute("disabled")
    nextName.textContent = sectionNames[index + 1]
  }
}

function setTargetClassInMenu(hash) {
  const menuId = `menu-item-${hash}`

  menuItems.forEach( menuItem => {
    if (menuItem.id === menuId) {
      activeItem = menuItem
      activeItem.classList.add("target")
      // Ensure the entire button is visible
      activeItem.scrollIntoView()

    } else {
      menuItem.classList.remove("target")
    }
  })
}



// Scroll to selection when user uses Find In Page
function scrollToSelection() {
  let selection = document.getSelection()

  if (!selection.toString()) { // selection is an empty string...
    if (selectMap) {           // ... and we've just changed page
      setTimeout(recreateSelection, 0)
    }
    return
  }

  function recreateSelection() {
    const {
      anchorNode,
      anchorOffset,
      focusNode,
      focusOffset
    } = selectMap

    const range = new Range()
    range.setStart(anchorNode, anchorOffset)
    range.setEnd(focusNode, focusOffset)


    selection.removeAllRanges()
    selection.addRange(range)
    anchorNode.parentElement.scrollIntoView()
    // scrollToSelection() will now be called again, but the
    // section.id will remain the same, so the call will return
    // without doing anything.

    // Make sure that nothing happens if the user simply clicks on
    // the page and so creates an empty selection
    selectMap = false
  }

  const parent = selection.anchorNode.parentElement
  const id = parent.closest("section[id]")?.id

  if (!id || location.hash === "#"+id) {
    // The selection will already have been automatically scrolled
    // into view
    return
  }

  // The new selection is not on the same "page", so the user
  // _can't_ have made the selection by clicking on the page.
  // Conclusion: the selection was made by the browsers' search
  // feature.

  // Changing the "page" makes document.getSelection() collapse
  // to an empty string. Create selectMap so recreateSelection()
  // will be triggered when scrollToSelection() is next called.

  let {
    anchorNode,
    anchorOffset,
    focusNode,
    focusOffset
  } = selection

  selectMap = {
    anchorNode,
    anchorOffset,
    focusNode,
    focusOffset
  }

  location.hash = id
}
const debouncedSelection = debounce(scrollToSelection, 10)
document.addEventListener("selectionchange", debouncedSelection)



// Remember where this page was last scrolled to
main.addEventListener("scroll", debounce(setScrollMeasure))

function setScrollMeasure() {
  // Check if the section is scrolled all the way to the end...
  const { scrollHeight, offsetHeight, scrollTop } = main
  const atEnd = scrollTop > scrollHeight - offsetHeight - endFudge

  let measure

  if (atEnd) {
    // ... and if so, ensure that the end of the section is
    // shown on the next visit, so that the #previous and #next
    // buttons are visible
    measure = blocks.length - 1

  } else {
    // Show the beginning of the block that was at the top
    let fraction
    measure = blocks.findIndex( block => {
      const { top, bottom } = block.getBoundingClientRect()
      const found = bottom > 0

      if (found) {
        fraction = -top / (bottom - top)
      }

      return found
    })

    // integer part = index of element
    // fractional part = proportion hidden above top of viewport
    measure = Math.max(0, measure) + fraction
  }

  tops[hash] = measure

  storage.set({ tops })
}



// Dealing with Menu interactions //
icon.addEventListener("click", toggleMenu)

function toggleMenu() {
  menuIsOpen = !menuIsOpen
  const action = menuIsOpen ? "add" : "remove"
  menu.classList[action]("open")

  if (menuIsOpen) {
    // Prepare to close the menu if click is not on a page link
    document.body.onmousedown = closeMenu
    // Centre the item for the current page
    activeItem.scrollIntoView({ block: "center" })

  } else {
    document.body.onmousedown = null
  }

  function closeMenu({ target }) {
    while (target) {
      if (target === list || target === icon) {
        break
      }
      target = target.parentNode
    }

    if (target) {
      // Let the click on the icon do its own work
      return
    }

    toggleMenu()
  }
}


// Navigating with the footer //
foot.addEventListener("mouseup", goSection)

function goSection({ target }) {
  let { id } = target
  if (!id) {
    return
  }
  id = id.replace("-name", "")
  let direction = [0, "previous", 0, "next"].indexOf(id)
  // -1, 1, 3
  if (direction < 0) {
    return
  }

  const index = sectionIds.indexOf(hash)
              + direction - 2
  const sectionId = sectionIds[index]
  location.hash = sectionId
}


// Helper, in case data-item is not set for a section //
function getStartOfText(element) {
  const punctuation = [".", ",", ":", ";", "-", "—", " "]
  const stop = [".", "!", "?", "\""]


  let text = element.innerText // only visible text
  const length = text.length
  if (length > linkLength) {
    text = text.slice(0, linkLength)
    text = text.replace(/(\n)|(\\n)/g, "").trim()
    const spaceIndex = text.lastIndexOf(" ")
    if (spaceIndex > 0) {
      text = text.slice(0, spaceIndex)
      while (punctuation.indexOf(text.slice(-1)) > 0) {
        text = text.slice(0, -1)
      }

      if (stop.indexOf(text.slice(-1)) < 0) {
        text += "…"
      }
    }
  }

  return text
}


// Dealing with internal links //
document.body.addEventListener("click", showAnchor)

function showAnchor({ target }) {
  if (target.matches("button[data-name^=anchor]")) {
    const name = target.dataset.name
    const anchor = document.querySelector(`[name=${name}]`)
    if (!anchor) {
      // The <tag name="anchor-xxx"> element hasn't been added yet
      return
    }

    hash = anchor.closest("section[id]").id
    location.hash = hash
    anchor.classList.add("highlight")

    // The hashchange event won't be immediate, but it will scroll
    // the page to its previous position. Wait for that to happen
    // before scrolling to the anchor and removing the highlight.
    setTimeout(() => {
      anchor.scrollIntoView()
      anchor.classList.remove("highlight")
    }, 10)
  }
}


// Ensuring that figcaptions on the first page (last section)
// are numbered first, and that figcaptions in other sections
// follow in order
const lastSection = document.querySelector("section:last-of-type")
const counter = lastSection.querySelectorAll("figcaption").length
if (counter) {
  lastSection.style.counterReset = "fig 0"
  const firstSection = document.querySelector("section")
  firstSection.style.counterReset = `fig ${counter}`
}


// Updating the selected menu item when scrolling through the
// page in #scroll mode
const debouncedScroll = debounce(updateMenuHighlight, 500)
main.addEventListener("scroll", debouncedScroll)
function updateMenuHighlight() {
  if (!document.querySelector("#scroll:checked")) { return }
  const scrollTop = main.scrollTop
  // Find the last section whose top is negative
  let lastId
  sections.some((section) => {
    const { top } = section.getBoundingClientRect()

    if (top <= 0) {
      lastId = section.id
    } else {
      return true
    }
  })
  const menuItem = document.getElementById(`menu-item-${lastId}`)
  const target = document.querySelector(".target")

  if (!menuItem || menuItem === target) {
    return
  }

  target.classList.remove("target")
  menuItem.classList.add("target")
  menuItem.scrollIntoView({ behavior: "smooth", block: "center"})
}


// Show credits for CC images
toCredit.forEach( img => {
  const alt = img.alt
  let credits = img.dataset.credits
   .replaceAll("<", "&lt;")
   .replaceAll(">", "&gt;")

  const links = []
  let match
  while ((match = CREDIT_REGEX.exec(credits))) {
    const [, text, link ] = match
    links.push({ text, link })
  }

  const credit = document.createElement("div")
  const title = document.createElement("h4")
  title.innerText = alt

  const details = document.createElement("p")
  credit.append(title)
  credit.classList.add("credit")
  links.forEach (({ text, link}) => {
    const a = `<a href="${link}">${text}</a>`
    const chunk = `[${text}](${link})`
    credits = credits.replace(chunk, a)
  })
  details.innerHTML = credits
  credit.append(details)

  img.after(credit)
})


// https://www.freecodecamp.org/news/javascript-debounce-example/
// USAGE //
// function postBounce(a,b,c){
//   console.log('Done', a, b, c);
// }
// const processChange = debounce(postBounce);
// for ( let ii = 0; ii < 1000; ii += 1 ) {
//   processChange(2,3,4)
// }
// // Will print Done 2 3 4 after bouncing is done

function debounce(debouncedFunction, delay = 200) {
  let timeout

  return (...args) => {
    clearTimeout(timeout);

    timeout = setTimeout(
      () => debouncedFunction.apply(null, args),
      delay
    );
  };
}

// Wait for Prism to finish syntax highlighting before
setTimeout(hashChange, 0)

// Close the menu, now that the user has seen where it is
setTimeout(toggleMenu, closeDelay)