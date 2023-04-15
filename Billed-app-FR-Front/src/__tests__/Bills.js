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

  describe("When the eye icon is clicked", () => {
    test("Then, a dialog window with the image of the bill should open.", () => {
      // On modifie l'objet global window pour y ajouter la méthode localStorage avec le mock localStorageMock.
      window = { ...window, localStorage: localStorageMock };

      // On ajoute un objet utilisateur avec un type "Employee" dans le localStorage.
      window.localStorage.setItem(
        "user",
        JSON.stringify({
          type: "Employee",
        })
      );

      // On ajoute le HTML généré par la fonction BillsUI avec la première facture du tableau bills au corps de la page.
      document.body.innerHTML = BillsUI({ data: [bills.shift()] });

      // On récupère le corps du tableau qui contient la première facture.
      const tableBody = screen.getByTestId("tbody");

      // On récupère la première ligne du tableau.
      const tableRow = tableBody.querySelector("tr");

      // On s'assure que la première ligne existe.
      expect(tableRow).not.toBeNull();

      // On définit une fonction onNavigate qui remplace le contenu du corps de la page avec la page associée au pathname.
      const onNavigate = (pathname) => {
        document.body.innerHTML = ROUTES({ pathname });
      };

      // On définit un objet store égal au tableau bills.
      const store = bills;

      // On crée une instance de la classe Bills en lui passant les éléments nécessaires pour son initialisation.
      const firstBill = new Bills({
        document,
        onNavigate,
        store,
        localStorage: window.localStorage,
      });

      // On modifie la méthode modal de jQuery pour qu'elle soit un mock vide.
      $.fn.modal = jest.fn();

      // On récupère l'icône de l'œil.
      const eyeIcon = screen.getByTestId("icon-eye");

      // On s'assure que l'icône de l'œil existe.
      expect(eyeIcon).not.toBeNull();

      // On définit une fonction handleClickIconEye égale à la méthode handleClickIconEye de l'instance firstBill avec l'icône de l'œil en paramètre.
      const handleClickIconEye = jest.fn(firstBill.handleClickIconEye(eyeIcon));

      // On ajoute un écouteur d'événement click sur l'icône de l'œil avec la fonction handleClickIconEye comme callback.
      eyeIcon.addEventListener("click", handleClickIconEye);

      // On déclenche l'événement click sur l'icône de l'œil.
      fireEvent.click(eyeIcon);

      // On s'assure que la fonction handleClickIconEye a été appelée.
      expect(handleClickIconEye).toHaveBeenCalled();

      // On récupère l'élément du DOM avec l'id "modaleFile".
      const dialogModal = document.getElementById("modaleFile");

      // On s'assure que l'élément du DOM avec l'id "modaleFile" existe.
      expect(dialogModal).not.toBeNull();
    });
  });

  describe("When I request the list of bills", () => {
    // On test la fenêtre de dialogue avec l'image de la facture qui doit s'ouvrir.
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

    // On teste si la fonction getBills attrape l'erreur de format de date correctement
    test("getBills should catch format date error", async () => {
      // On crée un mock de la méthode list() de l'objet bills pour renvoyer une facture avec une
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

      // On crée une instance de la classe Bills avec les paramètres nécessaires
      const billPage = new Bills({
        document: document,
        onNavigate: jest.fn(),
        store: store,
        localStorage: null,
      });

      // On appelle la fonction getBills() de l'instance Bills et on stocke le résultat dans la variable bills
      const bills = await billPage.getBills();

      // On recherche la facture avec la date invalide dans le tableau bills et on vérifie que la propriété date correspond bien à "error"
      const billWithErrorDate = bills.find((bill) => bill.id === "1");
      expect(billWithErrorDate.date).toEqual("error");
    });
  });
});

// Test pour vérifier la récupération des factures depuis l'API via une requête GET
describe("When I am on the Bills Page", () => {
  test("fetches bills from the mock API using GET", async () => {
    // On définit le type de l'utilisateur dans le local storage
    localStorage.setItem(
      "user",
      JSON.stringify({ type: "Employee", email: "a@a" })
    );
    // On crée un élément div dans lequel on va ajouter l'application
    const root = document.createElement("div");
    root.setAttribute("id", "root");
    document.body.append(root);
    // On charge l'application
    router();
    // On simule la navigation vers la page des factures
    window.onNavigate(ROUTES_PATH.Bills);

    // On vérifie que le bouton pour créer une nouvelle facture est présent
    const buttonNewBill = screen.getByTestId("btn-new-bill");
    expect(buttonNewBill).toBeTruthy();
  });

  // Test pour vérifier la récupération des factures depuis l'API en cas d'erreur
  describe("When an error occurs to the API", () => {
    beforeEach(() => {
      // On simule le local storage pour un utilisateur admin
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
      // On charge l'application
      router();
    });

    // Test pour vérifier le message d'erreur 404 lorsqu'il y a une erreur avec l'API
    test("fetches bills from an API and fails with 404 message error", async () => {
      mockStore.bills.mockImplementationOnce(() => {
        return {
          list: () => {
            return Promise.reject(new Error("Erreur 404"));
          },
        };
      });
      // On simule la navigation vers la page des factures
      window.onNavigate(ROUTES_PATH.Bills);
      // On attend la fin de la mise à jour du composant
      await new Promise(process.nextTick);
      // On vérifie que le message d'erreur 404 est présent
      const message = await screen.getByText(/Erreur 404/);
      expect(message).toBeTruthy();
    });

    // Test pour vérifier le message d'erreur 500 lorsqu'il y a une erreur avec l'API
    test("fetches messages from an API and fails with 500 message error", async () => {
      mockStore.bills.mockImplementationOnce(() => {
        return {
          list: () => {
            return Promise.reject(new Error("Erreur 500"));
          },
        };
      });

      // On simule la navigation vers la page des factures
      window.onNavigate(ROUTES_PATH.Bills);
      // On attend la fin de la mise à jour du composant
      await new Promise(process.nextTick);
      // On vérifie que le message d'erreur 500 est présent
      const message = await screen.getByText(/Erreur 500/);
      expect(message).toBeTruthy();
    });
  });
});
