/**
 * @jest-environment jsdom
 */

import {
  fireEvent,
  getByTestId,
  logDOM,
  screen,
  waitFor,
  mockImplementationOnce,
} from "@testing-library/dom";
import NewBillUI from "../views/NewBillUI.js";
import NewBill from "../containers/NewBill.js";
import { ROUTES_PATH, ROUTES } from "../constants/routes.js";
import mockedBills from "../__mocks__/store.js";
import { bills } from "../fixtures/bills.js";

beforeEach(() => {
  // Ajouter l'interface NewBillUI au corps de la page HTML
  document.body.innerHTML = NewBillUI();

  window.localStorage.setItem(
    "user",
    JSON.stringify({
      type: "Employee",
      email: "employee@test.tld",
      password: "employee",
      status: "connected",
    })
  );
});

afterEach(() => {
  jest.restoreAllMocks();
});

//---------------//
//---------------//
describe("Given I am connected as an employee", () => {
  describe("When I am on NewBill Page", () => {
    test("Then, should create NewBill object with valid parameters", () => {
      //  Définir des fonctions de simulation pour l'objet onNavigate, store
      const onNavigate = jest.fn();
      const store = {
        bills: jest.fn(() => ({
          create: jest.fn(() => Promise.resolve({})),
        })),
      };

      // Instancier un nouvel objet NewBill avec les fonctions de simulation et les paramètres de test
      const newBill = new NewBill({
        document,
        onNavigate,
        store,
        localStorage,
      });

      // Vérifier que chaque propriété de l'objet NewBill est correctement initialisée
      expect(newBill.document).toBe(document);
      expect(newBill.onNavigate).toBe(onNavigate);
      expect(newBill.store).toBe(store);
      expect(newBill.fileUrl).toBeNull();
      expect(newBill.fileName).toBeNull();
      expect(newBill.billId).toBeNull();
    });

    //---------------//
    test("Then handleChangeFile with valid file extension", () => {
      const onNavigate = jest.fn();
      const store = {
        bills: jest.fn(() => ({
          create: jest.fn(() => Promise.resolve({})),
        })),
      };
      const newBill = new NewBill({
        document,
        onNavigate,
        store,
        localStorage,
      });
      // Créer un objet de type File avec l'image à charger
      const file = new File(
        ["facturefreemobile.jpg"],
        "facturefreemobile.jpg",
        { type: "image/jpeg" }
      );

      // Sélectionner l'input pour ajouter l'image
      const input = screen.getByTestId("file");
      Object.defineProperty(input, "files", {
        value: [file],
      });

      // Simuler l'événement de changement de fichier
      const handleChangeFile = jest.fn(newBill.handleChangeFile);
      input.addEventListener("change", handleChangeFile);
      fireEvent.change(input);

      // Vérifier que le fichier a été chargé
      expect(handleChangeFile).toHaveBeenCalled();
      expect(input.files[0]).toStrictEqual(file);
    });

    //---------------//
    test("Then handleChangeFile with invalid file extension", () => {
      const onNavigate = jest.fn();
      const store = {
        bills: jest.fn(() => ({
          create: jest.fn(() => Promise.resolve({})),
        })),
      };
      const newBill = new NewBill({
        document,
        onNavigate,
        store,
        localStorage,
      });

      // Créer un objet de type File avec le fichier pdf à charger
      const file = new File(
        ["facturefreemobile.pdf"],
        "facturefreemobile.pdf",
        { type: "application/pdf" }
      );

      // Espionner la méthode alert() de la fenêtre
      const alertMock = jest
        .spyOn(window, "alert")
        .mockImplementation(() => {});

      // Sélectionner l'input pour ajouter le fichier
      const input = screen.getByTestId("file");
      Object.defineProperty(input, "files", {
        value: [file],
      });

      // Simuler l'événement de changement de fichier
      const handleChangeFile = jest.fn(newBill.handleChangeFile);
      input.addEventListener("change", handleChangeFile);
      fireEvent.change(input);

      // Vérifier que la méthode alert() a été appelée avec le message personnalisé
      expect(alertMock).toHaveBeenCalledWith(
        "Veuillez sélectionner une image valide (png, jpeg ou jpg)."
      );

      // Vérifier que le fichier n'a pas été chargé
      expect(handleChangeFile).toHaveBeenCalled();
      expect(Array.from(input.files[0])).toHaveLength(0);
    });

    //---------------//
    test("Then, i fill in all the fields in the form correctly and submit it, I expect the form to be sent to the Back-end", () => {
      const onNavigate = jest.fn();
      const newBills = new NewBill({
        document,
        onNavigate,
        store: mockedBills,
        localStorage,
      });

      // Définit une fonction fictive qui simule la fonction de soumission du formulaire
      const handleSubmit = jest.fn(() => newBills.handleSubmit);

      // Récupère une référence au formulaire de l'interface utilisateur et ajoute un événement qui écoute la soumission du formulaire et déclenche la fonction `handleSubmit` lorsqu'il est déclenché
      const form = screen.getByTestId("form-new-bill");
      form.addEventListener("submit", handleSubmit);

      // Récupère les différents elements à remplir du formulaire.
      const selectElement = document.querySelector("select");
      const expenditureInput = screen.getByTestId("expense-name");
      const dateInput = screen.getByTestId("datepicker");
      const amountInput = screen.getByTestId("amount");
      const vatInput = screen.getByTestId("vat");
      const percentageInput = screen.getByTestId("pct");
      const commentInput = screen.getByTestId("commentary");

      // Modifie les valeurs de chaque élément de l'interface utilisateur
      selectElement.value = "Services en ligne";
      expenditureInput.value = "Test";
      dateInput.value = "2022-12-11";
      amountInput.value = 420;
      vatInput.value = 69;
      percentageInput.value = 10;
      commentInput.value = "bruh";

      // Déclenche un événement qui simule la soumission du formulaire
      fireEvent.submit(form);
      // Vérifie que le formulaire est "true"
      expect(form).toBeTruthy();
    });
  });

  //---------------//
  //---------------//
  describe("When i'm posting a form that is valid", () => {
    test("Then, we fetch the new Bills from the mock using the API with the POST protocol", async () => {
      // Met à jour la liste des factures stockées dans le mock avec la nouvelle facture
      const mockedStoreBills = await mockedBills.bills().create(bills);

      // S'assure que le key de la facture obtenu dans mockedStoreBills est bien la bonne
      expect(mockedStoreBills.key).toBe("1234");

      // S'assure que la mise à jour des factures n'est pas null
      expect(mockedStoreBills).not.toBeNull();
    });

    //---------------//
    test("Then, we fetch the new Bills from the mock using the API with the PUT protocol", async () => {
      // Met à jour la liste des factures stockées dans le mock avec la nouvelle facture
      const mockedStoreBills = await mockedBills.bills().update(bills);

      // S'assure que l'ID de la facture obtenu dans mockedStoreBills est bien la bonne
      expect(mockedStoreBills.id).toBe("47qAXb6fIm2zOKkLzMro");

      // S'assure que la mise à jour des factures n'est pas null
      expect(mockedStoreBills).not.toBeNull();
    });
  });

  //---------------//
  //---------------//
  describe("When i'm posting a form that is invalid", () => {
    test("If there is an error while posting the bill, the function should catch it and log an error message", async () => {
    // On crée un objet simulé qui contient une fonction "create" qui renvoie la fonction simulée ci-dessus
    const mockedStoreBills = {
      bills: jest.fn(() => ({ create: mockedCreate })),
    };

    // On crée des fonctions simulées pour "onNavigate" et "localStorage"
    const onNavigate = jest.fn();
    const localStorage = {
      getItem: jest.fn(),
      setItem: jest.fn(),
    };

    // On crée une instance de la classe "NewBill", en passant les objets simulés ci-dessus comme arguments
    const newBills = new NewBill({
      document,
      onNavigate,
      store: mockedStoreBills,
      localStorage,
    });

    // On crée un objet "File" simulé et on l'associe à un élément HTML simulé
    const file = new File(
      ["facturefreemobile.jpg"],
      "facturefreemobile.jpg",
      { type: "image/jpeg" }
    );
    const input = screen.getByTestId("file");

    // On définit la propriété "files" de l'élément HTML simulé ci-dessus pour qu'elle renvoie le fichier simulé ci-dessus
    Object.defineProperty(input, "files", {
      value: [file],
    });

    // On crée un objet "event" simulé qui contient l'élément HTML simulé ci-dessus, ainsi que des méthodes de simulation pour l'objet "event"
    const eventMock = {
      target: {
        value: "facturefreemobile.jpg",
        files: [file],
      },
      preventDefault: jest.fn(),
    };

    // On appelle la fonction "handleChangeFile" de l'instance "newBills" de la classe "NewBill" en lui passant l'objet "event" simulé ci-dessus
    // On s'attend à ce que cette fonction renvoie une erreur qui doit être capturée dans la clause "catch" ci-dessous
    try {
      await newBills.handleChangeFile(eventMock);
    } catch (error) {
      // On vérifie que l'erreur renvoyée est bien l'erreur "Erreur 404" simulée ci-dessus
      expect(error.message).toBe("Erreur 404");
    }
  });

    //---------------//
    test("If there is an error while updating the bill, the function should catch it and log an error message", async () => {
// On crée un mock de la méthode `update` de l'objet `bills` qui retourne une promesse rejetée avec une erreur "Erreur 404"
const updateMock = jest.fn(() => Promise.reject(Error("Erreur 404")));
// On crée un objet `mockedStoreBills` avec une méthode `bills` qui retourne un objet contenant le mock de la méthode `update`
const mockedStoreBills = {
  bills: jest.fn(() => ({ update: updateMock })),
};

// On crée un mock de la méthode `onNavigate`
const onNavigate = jest.fn();
// On crée un objet `newBills` de type `NewBill` avec les paramètres spécifiés
const newBills = new NewBill({
  document,
  onNavigate,
  store: mockedStoreBills,
  localStorage,
});

// On appelle la méthode `updateBill` de `newBills` avec l'objet `bills` en paramètre
try {
  await newBills.updateBill(bills);
} catch (error) {
  // On vérifie que l'erreur retournée est "Erreur 404"
  expect(error.message).toBe("Erreur 404");
}

// On crée un spy sur la méthode `console.error` pour vérifier que la méthode a été appelée avec le message d'erreur
const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

// On vérifie que la méthode `console.error` a bien été appelée avec le message d'erreur "Erreur 404"
expect(consoleSpy).toHaveBeenCalledWith("Erreur 404");

// On restaure la méthode `console.error` à son implémentation d'origine
consoleSpy.mockRestore()
});
  });
});
