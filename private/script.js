;(async function generateTutorialLinksFromJSON(){
  const ul = document.getElementById("tutorials")
  const URL = "private/tutorials.json"
  let tutorials = []

  try {
    const response = await fetch(URL)
    tutorials = await response.json()
    displayTutorials(tutorials)

  } catch (error) {
    // No JSON available
    const li = document.createElement("li")
    li.innerText = "Provide links to your tutorials here"
    ul.append(li)
  }

  function displayTutorials(tutorials) {
    const replace = document.getElementById("replace")
    if (replace) {
      replace.innerHTML = "Replace the placeholder links below with working links to your own tutorials.<br><br>See <code>private/tutorials.json</code> for inspiration."
    }

    tutorials.forEach(({
      url,
      name="",
      description="",
      icon="private/icons/default.svg"
    }) => {
      if ( url && ( name  || description )) {
        const li = document.createElement("li")
        const a = document.createElement("a")
        const div = document.createElement("div")
        const h3 = document.createElement("h3")
        const img = document.createElement("img")
        const span = document.createElement("span")

        a.href = url
        img.src = icon
        img.alt = ""

        h3.innerText = name
        span.innerText = description

        div.append(h3)
        div.append(span)

        a.append(img)
        a.append(div)

        li.append(a)
        ul.append(li)
      }
    })
  }
})()