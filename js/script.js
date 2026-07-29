/* ==========================================================================
   MARROW & EMBER — main script
   This one file is loaded on every page. Each block below checks that its
   target elements actually exist before doing anything, so the same file
   works whether it is loaded on the home page, the menu page, or contact.
   ========================================================================== */

/* --------------------------------------------------------------------
   Mobile navigation toggle
   Shows and hides the nav list on small screens, and updates
   aria-expanded so the control is announced correctly by screen readers.
   -------------------------------------------------------------------- */
function setUpNavToggle() {
  var toggle = document.querySelector(".nav-toggle");
  var navList = document.querySelector(".site-nav__list");

  if (!toggle || !navList) {
    return;
  }

  toggle.addEventListener("click", function () {
    var isOpen = navList.classList.toggle("is-open");
    toggle.classList.toggle("is-open", isOpen);
    toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
  });

  /* Close the menu automatically once a link is chosen, so it does not
     stay open after navigating to the next page. */
  navList.addEventListener("click", function (event) {
    if (event.target.tagName === "A") {
      navList.classList.remove("is-open");
      toggle.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
    }
  });
}

/* --------------------------------------------------------------------
   Roast curve reveal
   The SVG line on the home page draws itself in once, the first time it
   scrolls into the viewport, using IntersectionObserver rather than a
   scroll event listener so it only runs the calculation when needed.
   -------------------------------------------------------------------- */
function setUpRoastCurveReveal() {
  var figure = document.querySelector(".roast-curve");

  if (!figure || !("IntersectionObserver" in window)) {
    if (figure) {
      figure.classList.add("is-visible");
    }
    return;
  }

  var observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          figure.classList.add("is-visible");
          observer.unobserve(figure);
        }
      });
    },
    { threshold: 0.4 }
  );

  observer.observe(figure);
}

/* --------------------------------------------------------------------
   Menu filtering
   Toggles a data-category attribute match against a chosen filter button.
   Also shows a small "nothing matches" message if a future category is
   added with no items yet, rather than leaving a blank page.
   -------------------------------------------------------------------- */
function setUpMenuFilters() {
  var buttons = document.querySelectorAll(".filter-btn");
  var items = document.querySelectorAll(".menu-item");
  var emptyMessage = document.querySelector(".menu-empty");

  if (buttons.length === 0 || items.length === 0) {
    return;
  }

  buttons.forEach(function (button) {
    button.addEventListener("click", function () {
      var chosenCategory = button.getAttribute("data-filter");
      var visibleCount = 0;

      buttons.forEach(function (otherButton) {
        otherButton.classList.remove("is-active");
      });
      button.classList.add("is-active");

      items.forEach(function (item) {
        var matches =
          chosenCategory === "all" ||
          item.getAttribute("data-category") === chosenCategory;

        item.style.display = matches ? "flex" : "none";

        if (matches) {
          visibleCount += 1;
        }
      });

      if (emptyMessage) {
        emptyMessage.style.display = visibleCount === 0 ? "block" : "none";
      }
    });
  });
}

/* --------------------------------------------------------------------
   Contact form validation
   Runs entirely in the browser since there is no server to send the
   form to. Checks each field on submit, writes a specific message next
   to the field that failed, and only shows the success state once every
   field is valid.
   -------------------------------------------------------------------- */
function setUpContactForm() {
  var form = document.querySelector("#contact-form");

  if (!form) {
    return;
  }

  var status = form.querySelector(".form-status");

  var validators = {
    name: function (value) {
      return value.trim().length >= 2 ? "" : "Enter your name.";
    },
    email: function (value) {
      var pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return pattern.test(value.trim()) ? "" : "Enter a valid email address.";
    },
    message: function (value) {
      return value.trim().length >= 10
        ? ""
        : "Say a little more, at least 10 characters.";
    }
  };

  form.addEventListener("submit", function (event) {
    event.preventDefault();

    var isFormValid = true;

    Object.keys(validators).forEach(function (fieldName) {
      var field = form.querySelector("[name='" + fieldName + "']");
      var errorSpan = form.querySelector(
        ".field__error[data-for='" + fieldName + "']"
      );
      var message = validators[fieldName](field.value);

      if (errorSpan) {
        errorSpan.textContent = message;
      }

      if (message) {
        isFormValid = false;
      }
    });

    if (!status) {
      return;
    }

    status.classList.remove("is-success", "is-error");

    if (isFormValid) {
      status.textContent =
        "Thanks, your message has been noted. We reply within two working days.";
      status.classList.add("is-success");
      form.reset();
    } else {
      status.textContent = "Please fix the highlighted fields and try again.";
      status.classList.add("is-error");
    }
  });
}

/* --------------------------------------------------------------------
   Shopping cart storage
   The cart is a plain array of { id, name, price, qty } objects, kept in
   localStorage so it survives moving between shop.html, cart.html and
   checkout.html, none of which are the same page load. There is no
   server behind this, so nothing here is a real payment, it only
   demonstrates the client side logic a real cart would need.
   -------------------------------------------------------------------- */
var CART_KEY = "marrowEmberCart";

function readCart() {
  var raw = localStorage.getItem(CART_KEY);

  if (!raw) {
    return [];
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    /* If the stored value is ever corrupted, start fresh rather than
       breaking the page. */
    return [];
  }
}

function writeCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartBadge();
}

function cartTotal(cart) {
  return cart.reduce(function (sum, item) {
    return sum + item.price * item.qty;
  }, 0);
}

function formatPrice(amount) {
  return "\u00A3" + amount.toFixed(2);
}

/* The small number next to "Cart" in the header, present on every page,
   so a shopper can see their basket size no matter where they are. */
function updateCartBadge() {
  var badge = document.querySelector(".cart-count");

  if (!badge) {
    return;
  }

  var cart = readCart();
  var itemCount = cart.reduce(function (sum, item) {
    return sum + item.qty;
  }, 0);

  badge.textContent = itemCount;
  badge.setAttribute("data-empty", itemCount === 0 ? "true" : "false");
}

/* --------------------------------------------------------------------
   Shop page
   Each product card carries its details as data attributes, read here
   rather than hard coded twice, so the HTML stays the single source of
   truth for name and price.
   -------------------------------------------------------------------- */
function setUpShopPage() {
  var addButtons = document.querySelectorAll("[data-add-to-cart]");

  if (addButtons.length === 0) {
    return;
  }

  addButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      var id = button.getAttribute("data-id");
      var name = button.getAttribute("data-name");
      var price = parseFloat(button.getAttribute("data-price"));

      var cart = readCart();
      var existing = cart.find(function (item) {
        return item.id === id;
      });

      if (existing) {
        existing.qty += 1;
      } else {
        cart.push({ id: id, name: name, price: price, qty: 1 });
      }

      writeCart(cart);

      /* A short, temporary confirmation on the button itself, so the
         shopper gets feedback without a page reload or a popup. */
      var originalLabel = button.textContent;
      button.textContent = "Added";
      window.setTimeout(function () {
        button.textContent = originalLabel;
      }, 1200);
    });
  });
}

/* --------------------------------------------------------------------
   Cart page
   Rebuilds the whole table from localStorage on every change, which is
   simple to reason about for a basket this small rather than patching
   individual rows.
   -------------------------------------------------------------------- */
function setUpCartPage() {
  var tableBody = document.querySelector("#cart-table-body");

  if (!tableBody) {
    return;
  }

  var emptyMessage = document.querySelector(".cart-empty");
  var summarySubtotal = document.querySelector("#cart-subtotal");
  var checkoutLink = document.querySelector("#checkout-link");

  function renderCart() {
    var cart = readCart();
    tableBody.innerHTML = "";

    if (cart.length === 0) {
      if (emptyMessage) emptyMessage.style.display = "block";
      if (summarySubtotal) summarySubtotal.textContent = formatPrice(0);
      if (checkoutLink) checkoutLink.setAttribute("aria-disabled", "true");
      return;
    }

    if (emptyMessage) emptyMessage.style.display = "none";
    if (checkoutLink) checkoutLink.removeAttribute("aria-disabled");

    cart.forEach(function (item) {
      var row = document.createElement("tr");

      row.innerHTML =
        "<td class='cart-table__name'>" + item.name + "</td>" +
        "<td>" + formatPrice(item.price) + "</td>" +
        "<td>" +
          "<span class='qty-stepper'>" +
            "<button type='button' data-action='decrease' data-id='" + item.id + "' aria-label='Decrease quantity'>-</button>" +
            "<span>" + item.qty + "</span>" +
            "<button type='button' data-action='increase' data-id='" + item.id + "' aria-label='Increase quantity'>+</button>" +
          "</span>" +
        "</td>" +
        "<td>" + formatPrice(item.price * item.qty) + "</td>" +
        "<td><button type='button' class='remove-btn' data-action='remove' data-id='" + item.id + "'>Remove</button></td>";

      tableBody.appendChild(row);
    });

    if (summarySubtotal) {
      summarySubtotal.textContent = formatPrice(cartTotal(cart));
    }
  }

  /* One listener on the table body handles every row, using event
     delegation, rather than attaching a listener per button that would
     need re-attaching every time the table is rebuilt. */
  tableBody.addEventListener("click", function (event) {
    var button = event.target.closest("button[data-action]");

    if (!button) {
      return;
    }

    var cart = readCart();
    var id = button.getAttribute("data-id");
    var action = button.getAttribute("data-action");
    var item = cart.find(function (cartItem) {
      return cartItem.id === id;
    });

    if (!item) {
      return;
    }

    if (action === "increase") {
      item.qty += 1;
    } else if (action === "decrease") {
      item.qty -= 1;
      if (item.qty <= 0) {
        cart = cart.filter(function (cartItem) {
          return cartItem.id !== id;
        });
      }
    } else if (action === "remove") {
      cart = cart.filter(function (cartItem) {
        return cartItem.id !== id;
      });
    }

    writeCart(cart);
    renderCart();
  });

  renderCart();
}

/* --------------------------------------------------------------------
   Checkout page
   Shows a read only order summary pulled from the same cart, validates
   the shipping details, and on a valid submit simulates placing the
   order (there is no payment gateway, this is a teaching project).
   -------------------------------------------------------------------- */
function setUpCheckoutPage() {
  var summaryList = document.querySelector("#order-summary-list");
  var summaryTotal = document.querySelector("#order-summary-total");
  var form = document.querySelector("#checkout-form");

  if (!summaryList || !form) {
    return;
  }

  var cart = readCart();
  summaryList.innerHTML = "";

  cart.forEach(function (item) {
    var line = document.createElement("div");
    line.className = "order-summary__line";
    line.innerHTML =
      "<span>" + item.name + " &times; " + item.qty + "</span>" +
      "<span>" + formatPrice(item.price * item.qty) + "</span>";
    summaryList.appendChild(line);
  });

  if (summaryTotal) {
    summaryTotal.textContent = formatPrice(cartTotal(cart));
  }

  if (cart.length === 0) {
    form.querySelector("button[type='submit']").disabled = true;
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();

    var nameField = form.querySelector("[name='fullName']");
    var addressField = form.querySelector("[name='address']");
    var confirmation = document.querySelector("#order-confirmation");

    var isValid =
      nameField.value.trim().length >= 2 &&
      addressField.value.trim().length >= 5;

    if (!isValid) {
      form.querySelector(".field__error[data-for='fullName']").textContent =
        nameField.value.trim().length >= 2 ? "" : "Enter your full name.";
      form.querySelector(".field__error[data-for='address']").textContent =
        addressField.value.trim().length >= 5 ? "" : "Enter a delivery address.";
      return;
    }

    /* Clear the cart, since the simulated order has now been "placed" */
    writeCart([]);

    form.style.display = "none";
    if (confirmation) {
      confirmation.classList.add("is-visible");
    }
  });
}

/* --------------------------------------------------------------------
   Run everything once the page has parsed
   -------------------------------------------------------------------- */
document.addEventListener("DOMContentLoaded", function () {
  setUpNavToggle();
  setUpRoastCurveReveal();
  setUpMenuFilters();
  setUpContactForm();
  updateCartBadge();
  setUpShopPage();
  setUpCartPage();
  setUpCheckoutPage();
});
