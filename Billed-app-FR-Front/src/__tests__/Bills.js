/**
 * @jest-environment jsdom
 */

import {
  fireEvent,
  getByTestId,
  logDOM,
  screen,
  waitFor,
} from "@testing-library/dom";
import BillsUI from "../views/BillsUI.js";
import { bills } from "../fixtures/bills.js";
import { ROUTES_PATH, ROUTES } from "../constants/routes.js";
import { localStorageMock } from "../__mocks__/localStorage.js";
import Bills from "../containers/Bills";
import { formatDate, formatStatus } from "../app/format.js";
import mockStore from "../__mocks__/store";
import router from "../app/Router.js";

jest.mock("../app/store", () => mockStore);

describe("Given I am connected as an employee", () => {
  describe("When I am on Bills Page", () => {
    test("Then bill icon in vertical layout should be highlighted", async () => {
      Object.defineProperty(window, "localStorage", {
        value: localStorageMock,
      });
      window.localStorage.setItem(
        "user",
        JSON.stringify({
          type: "Employee",
        })
      );
      const root = document.createElement("div");
      root.setAttribute("id", "root");
      document.body.append(root);
      router();
      window.onNavigate(ROUTES_PATH.Bills);
      await waitFor(() => screen.getByTestId("icon-window"));
      const windowIcon = screen.getByTestId("icon-window");
      //to-do write expect expression
      expect(windowIcon.classList.contains("active-icon")).toBe(true);
    });

    test("Then bills should be ordered from earliest to latest", () => {
      document.body.innerHTML = BillsUI({ data: bills });
      const dates = screen
        .getAllByText(
          /^(19|20)\d\d[- /.](0[1-9]|1[012])[- /.](0[1-9]|[12][0-9]|3[01])$/i
        )
        .map((a) => a.innerHTML);
      const antiChrono = (a, b) =>
        new Date(Date.parse(a.date)) - new Date(Date.parse(b.date));
      const datesSorted = [...dates].sort(antiChrono);

      expect(dates).toEqual(datesSorted);
    });
  });

  //test click bouton new note frais
  describe("When I click on the 'New Bill' button", () => {
    test("Then the handleClickNewBill method should be called", () => {
      const handleClickNewBill = jest.fn();
      const billPage = new Bills({
        document: document,
        onNavigate: jest.fn(),
        store: null,
        localStorage: null,
      });
      billPage.handleClickNewBill = handleClickNewBill;
      const buttonNewBill = screen.getByTestId("btn-new-bill");
      buttonNewBill.addEventListener("click", billPage.handleClickNewBill);
      fireEvent.click(buttonNewBill);
      expect(handleClickNewBill).toHaveBeenCalled();
    });
  });

  // test("Then handleClickIconEye should return the expected constants when called by a click", () => {
  //   const billUrl =
  //     "http://localhost:5678/public/4b392f446047ced066990b0627cfa444";
  //   const imgWidth = 500;
  //   const icon = document.createElement("div");
  //   icon.setAttribute("data-bill-url", billUrl);
  //   const billPage = new Bills({
  //     document: document,
  //     onNavigate: jest.fn(),
  //     store: null,
  //     localStorage: null,
  //   });
  //    $.fn.modal = jest.fn();

  //   const expectedResult = `<div style='text-align: center;' class="bill-proof-container"><img width=${imgWidth} src=${billUrl} alt="Bill" /></div>`;
  //   const result = billPage.handleClickIconEye(icon);
  //   expect(result).toBe(expectedResult);
  // });

  describe("When the eye icon is clicked", () => {
    test("Then, a dialog window with the image of the bill should open.", () => {
      window = { ...window, localStorage: localStorageMock };

      window.localStorage.setItem(
        "user",
        JSON.stringify({
          type: "Employee",
        })
      );

      document.body.innerHTML = BillsUI({ data: [bills.shift()] });

      const tableBody = screen.getByTestId("tbody");

      const tableRow = tableBody.querySelector("tr");

      expect(tableRow).not.toBeNull();

      const onNavigate = (pathname) => {
        document.body.innerHTML = ROUTES({ pathname });
      };
      const store = bills;
      const firstBill = new Bills({
        document,
        onNavigate,
        store,
        localStorage: window.localStorage,
      });
      $.fn.modal = jest.fn();
      const eyeIcon = screen.getByTestId("icon-eye");

      expect(eyeIcon).not.toBeNull();

      const handleClickIconEye = jest.fn(firstBill.handleClickIconEye(eyeIcon));
      eyeIcon.addEventListener("click", handleClickIconEye);

      fireEvent.click(eyeIcon);

      expect(handleClickIconEye).toHaveBeenCalled();

      const dialogModal = document.getElementById("modaleFile");
      expect(dialogModal).not.toBeNull();
    });
  });

  describe("When I request the list of bills", () => {
    test("Then the bills should be returned in the correct format and sorted by date", async () => {
      const store = { bills: () => ({ list: () => bills }) };
      const billPage = new Bills({
        document: document,
        onNavigate: jest.fn(),
        store: store,
        localStorage: null,
      });
      const getBills = await billPage.getBills();
      expect(Array.isArray(getBills)).toBe(true);

      // Vérifier le format des factures
      expect(getBills).toEqual(
        bills.map((doc) => ({
          ...doc,
          date: formatDate(doc.date),
          status: formatStatus(doc.status),
        }))
      );

      // Vérifier le tri des factures par date croissante
      const sortedBills = bills.sort(
        (a, b) => new Date(a.date) - new Date(b.date)
      );
      expect(getBills).toEqual(
        sortedBills.map((doc) => ({
          ...doc,
          date: formatDate(doc.date),
          status: formatStatus(doc.status),
        }))
      );
    });

    test("getBills should catch format date error", async () => {
      const store = {
        bills: () => ({
          list: jest.fn().mockResolvedValue([
            {
              id: "1",
              amount: 100,
              email: "a@a",
              name: "test1",
              pct: 20,
              vat: "",
              type: "Transports",
              fileName: "1592770761.jpeg",
              fileUrl:
                "https://test.storage.tld/v0/b/billable-677b6.a…61.jpeg?alt=media&token=7685cd61-c112-42bc-9929-8a799bb82d8b",
              date: "error", // invalid date format
              commentary: "plop",
              status: "En attente",
              commentAdmin: "en fait non",
            },
          ]),
        }),
      };

      const billPage = new Bills({
        document: document,
        onNavigate: jest.fn(),
        store: store,
        localStorage: null,
      });

      const bills = await billPage.getBills();
      const billWithErrorDate = bills.find((bill) => bill.id === "1");
      expect(billWithErrorDate.date).toEqual("error");
    });
  });
});


//GET test
describe("When I am on the Bills Page", () => {
  test("fetches bills from the mock API using GET", async () => {
    localStorage.setItem(
      "user",
      JSON.stringify({ type: "Employee", email: "a@a" })
    );
    const root = document.createElement("div");
    root.setAttribute("id", "root");
    document.body.append(root);
    router();
    window.onNavigate(ROUTES_PATH.Bills);

    const buttonNewBill = screen.getByTestId("btn-new-bill");

    expect(buttonNewBill).toBeTruthy();
  });

  describe("When an error occurs to the API", () => {
    beforeEach(() => {
      jest.spyOn(mockStore, "bills");
      Object.defineProperty(window, "localStorage", {
        value: localStorageMock,
      });
      window.localStorage.setItem(
        "user",
        JSON.stringify({
          type: "Admin",
          email: "a@a",
        })
      );
      const root = document.createElement("div");
      root.setAttribute("id", "root");
      document.body.appendChild(root);
      router();
    });
    test("fetches bills from an API and fails with 404 message error", async () => {
      mockStore.bills.mockImplementationOnce(() => {
        return {
          list: () => {
            return Promise.reject(new Error("Erreur 404"));
          },
        };
      });
      window.onNavigate(ROUTES_PATH.Bills);
      await new Promise(process.nextTick);
      const message = await screen.getByText(/Erreur 404/);
      expect(message).toBeTruthy();
    });

    test("fetches messages from an API and fails with 500 message error", async () => {
      mockStore.bills.mockImplementationOnce(() => {
        return {
          list: () => {
            return Promise.reject(new Error("Erreur 500"));
          },
        };
      });

      window.onNavigate(ROUTES_PATH.Bills);
      await new Promise(process.nextTick);
      const message = await screen.getByText(/Erreur 500/);
      expect(message).toBeTruthy();
    });
  });
});