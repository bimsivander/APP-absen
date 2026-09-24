/* =====================================================
   ALTIORAFI ATTENDANCE
   GITHUB PAGES FRONTEND
===================================================== */


/* =====================================================
   KONFIGURASI
===================================================== */

/*
 * GANTI URL DI BAWAH DENGAN
 * URL WEB APP GOOGLE APPS SCRIPT KAMU.
 *
 * Contoh:
 * https://script.google.com/macros/s/XXXXXXXX/exec
 */

const API_URL =
  "https://script.google.com/macros/s/AKfycbzENCik_B9MN-lyQbQ1PbhYfo5XmaxoWkCLnAtAV99kKWoddbPV2lfm5sBWwp115uDC/exec";


/* =====================================================
   STATE
===================================================== */

const APP = {

  token:
    localStorage.getItem(
      "altiorafi_token"
    ) || "",

  user:
    JSON.parse(
      localStorage.getItem(
        "altiorafi_user"
      ) || "null"
    ),

  scanner: null,

  scanning: false,

  lastScan: "",

  scanLocked: false

};


/* =====================================================
   INIT
===================================================== */

document.addEventListener(
  "DOMContentLoaded",
  function() {

    if (!API_URL ||
        API_URL.indexOf("PASTE_URL") !== -1) {

      showToast(
        "URL Google Apps Script belum diatur.",
        "error"
      );

      return;
    }


    if (APP.token) {

      showApp();

      initializeApp();

    } else {

      showLogin();

    }

  }
);


/* =====================================================
   PAGE
===================================================== */

function showLogin() {

  document
    .getElementById("loginPage")
    .classList.add("active");

  document
    .getElementById("appPage")
    .classList.remove("active");

}


function showApp() {

  document
    .getElementById("loginPage")
    .classList.remove("active");

  document
    .getElementById("appPage")
    .classList.add("active");

}


/* =====================================================
   API REQUEST
===================================================== */

async function api(action, params = {}) {

  const url =
    new URL(API_URL);

  url.searchParams.set(
    "action",
    action
  );


  Object.keys(params)
    .forEach(function(key) {

      const value =
        params[key];

      if (
        value !== undefined &&
        value !== null
      ) {

        url.searchParams.set(
          key,
          value
        );

      }

    });


  const response =
    await fetch(
      url.toString(),
      {
        method: "GET",
        redirect: "follow",
        cache: "no-store"
      }
    );


  if (!response.ok) {

    throw new Error(
      "Server API gagal merespons. HTTP " +
      response.status
    );

  }


  const data =
    await response.json();


  if (!data.success) {

    throw new Error(
      data.message ||
      "Terjadi kesalahan pada server."
    );

  }


  return data;

}


/* =====================================================
   LOGIN
===================================================== */

async function login() {

  const username =
    document
      .getElementById("username")
      .value
      .trim();

  const password =
    document
      .getElementById("password")
      .value;


  const message =
    document
      .getElementById(
        "loginMessage"
      );


  if (!username || !password) {

    message.textContent =
      "Username dan password wajib diisi.";

    message.className =
      "message error";

    return;

  }


  message.textContent =
    "Memeriksa login...";

  message.className =
    "message";


  try {

    const response =
      await api(
        "login",
        {
          username:
            username,

          password:
            password
        }
      );


    /*
     * Sesuaikan dengan hasil
     * function login() backend.
     */

    const data =
      response.data;


    APP.token =
      data.token ||
      data.Token ||
      "";


    APP.user =
      data.user ||
      data.User ||
      data.profile ||
      null;


    if (!APP.token) {

      throw new Error(
        "Token login tidak diterima dari server."
      );

    }


    localStorage.setItem(
      "altiorafi_token",
      APP.token
    );


    localStorage.setItem(
      "altiorafi_user",
      JSON.stringify(
        APP.user
      )
    );


    message.textContent = "";

    showApp();

    initializeApp();


    showToast(
      "Login berhasil.",
      "success"
    );


  } catch (error) {

    message.textContent =
      error.message;

    message.className =
      "message error";

  }

}


/* =====================================================
   LOGOUT
===================================================== */

function logout() {

  stopScanner();


  APP.token = "";

  APP.user = null;


  localStorage.removeItem(
    "altiorafi_token"
  );

  localStorage.removeItem(
    "altiorafi_user"
  );


  showLogin();


  showToast(
    "Kamu telah keluar.",
    "success"
  );

}


/* =====================================================
   INITIALIZE
===================================================== */

async function initializeApp() {

  checkConnection();

  await loadClasses();

  await loadSessions();

  startScanner();

}


/* =====================================================
   TEST CONNECTION
===================================================== */

async function checkConnection() {

  const badge =
    document
      .getElementById(
        "connectionStatus"
      );


  try {

    const result =
      await api("ping");


    if (result.success) {

      badge.textContent =
        "Terhubung";

      badge.className =
        "connection-badge online";

    }


  } catch (error) {

    badge.textContent =
      "Offline";

    badge.className =
      "connection-badge offline";

  }

}


/* =====================================================
   LOAD CLASSES
===================================================== */

async function loadClasses() {

  const select =
    document
      .getElementById(
        "classSelect"
      );


  try {

    const result =
      await api(
        "classes",
        {
          token:
            APP.token
        }
      );


    const classes =
      result.data || [];


    select.innerHTML =
      '<option value="">Pilih kelas</option>';


    classes.forEach(
      function(item) {

        const option =
          document.createElement(
            "option"
          );


        option.value =
          item.KelasID;


        option.textContent =
          item.NamaKelas;


        select.appendChild(
          option
        );

      }
    );


    /*
     * Jika sebelumnya tersimpan
     * kelas tertentu, pilih kembali.
     */

    const savedClass =
      localStorage.getItem(
        "altiorafi_class"
      );


    if (savedClass) {

      select.value =
        savedClass;

    }


  } catch (error) {

    select.innerHTML =
      '<option value="">Gagal memuat kelas</option>';


    showToast(
      error.message,
      "error"
    );

  }

}


/* =====================================================
   LOAD SESSION
===================================================== */

async function loadSessions() {

  const classSelect =
    document
      .getElementById(
        "classSelect"
      );

  const sessionSelect =
    document
      .getElementById(
        "sessionSelect"
      );


  const kelasId =
    classSelect.value;


  localStorage.setItem(
    "altiorafi_class",
    kelasId
  );


  sessionSelect.innerHTML =
    '<option value="">Memuat sesi...</option>';


  if (!kelasId) {

    sessionSelect.innerHTML =
      '<option value="">Pilih kelas terlebih dahulu</option>';

    return;

  }


  try {

    const result =
      await api(
        "sessions",
        {
          token:
            APP.token,

          kelasId:
            kelasId
        }
      );


    const sessions =
      result.data || [];


    /*
     * Hanya tampilkan sesi aktif.
     */

    const activeSessions =
      sessions.filter(
        function(item) {

          return String(
            item.Status || ""
          ).toLowerCase() ===
            "aktif";

        }
      );


    sessionSelect.innerHTML =
      '<option value="">Pilih sesi absensi</option>';


    activeSessions.forEach(
      function(item) {

        const option =
          document.createElement(
            "option"
          );


        option.value =
          item.SesiID;


        const mapel =
          item.NamaMapel ||
          item.MapelID ||
          "-";


        const mulai =
          item.JamMulai ||
          "--:--";


        const selesai =
          item.JamSelesai ||
          "--:--";


        option.textContent =
          mapel +
          " • " +
          mulai +
          " - " +
          selesai;


        sessionSelect.appendChild(
          option
        );

      }
    );


    if (
      activeSessions.length === 0
    ) {

      sessionSelect.innerHTML =
        '<option value="">Tidak ada sesi aktif</option>';

    }


  } catch (error) {

    sessionSelect.innerHTML =
      '<option value="">Gagal memuat sesi</option>';


    showToast(
      error.message,
      "error"
    );

  }

}


/* =====================================================
   START SCANNER
===================================================== */

async function startScanner() {

  stopScanner();


  APP.scanner =
    new Html5Qrcode(
      "reader"
    );


  try {

    const cameras =
      await Html5Qrcode.getCameras();


    if (
      !cameras ||
      !cameras.length
    ) {

      throw new Error(
        "Kamera tidak ditemukan."
      );

    }


    /*
     * Utamakan kamera belakang.
     */

    let cameraId =
      cameras[0].id;


    const backCamera =
      cameras.find(
        function(camera) {

          const label =
            String(
              camera.label || ""
            ).toLowerCase();


          return (
            label.includes("back") ||
            label.includes("rear") ||
            label.includes("environment")
          );

        }
      );


    if (backCamera) {

      cameraId =
        backCamera.id;

    }


    await APP.scanner.start(

      cameraId,

      {
        fps: 10,

        qrbox: {
          width: 250,
          height: 250
        },

        aspectRatio:
          1.0

      },

      function(decodedText) {

        handleQrResult(
          decodedText
        );

      },

      function(errorMessage) {

        /*
         * Error scan frame biasa
         * tidak perlu ditampilkan.
         */

      }

    );


    APP.scanning =
      true;


  } catch (error) {

    console.error(
      "Scanner error:",
      error
    );


    showToast(
      "Kamera tidak dapat dibuka. Pastikan izin kamera diberikan.",
      "error"
    );

  }

}


/* =====================================================
   STOP SCANNER
===================================================== */

function stopScanner() {

  if (
    APP.scanner &&
    APP.scanning
  ) {

    APP.scanner
      .stop()
      .catch(
        function() {}
      );

  }


  APP.scanning =
    false;

}


/* =====================================================
   QR RESULT
===================================================== */

async function handleQrResult(
  decodedText
) {

  if (
    APP.scanLocked
  ) {

    return;

  }


  const qrValue =
    String(
      decodedText || ""
    ).trim();


  if (!qrValue) {

    return;

  }


  /*
   * Cegah QR yang sama
   * diproses berkali-kali
   * oleh kamera.
   */

  if (
    APP.lastScan === qrValue
  ) {

    return;

  }


  const sessionId =
    document
      .getElementById(
        "sessionSelect"
      )
      .value;


  if (!sessionId) {

    showToast(
      "Pilih sesi absensi terlebih dahulu.",
      "error"
    );

    return;

  }


  APP.scanLocked =
    true;

  APP.lastScan =
    qrValue;


  try {

    /*
     * QR kita hanya berisi SiswaID.
     *
     * Contoh:
     * STD001
     */

    const result =
      await api(
        "scan",
        {
          token:
            APP.token,

          siswaId:
            qrValue,

          sesiId:
            sessionId
        }
      );


    showScanResult(
      result.data
    );


    showToast(
      "Absensi berhasil dicatat.",
      "success"
    );


  } catch (error) {

    showToast(
      error.message,
      "error"
    );


  } finally {

    /*
     * Beri jeda supaya kamera
     * tidak mencatat QR yang sama
     * berkali-kali.
     */

    setTimeout(
      function() {

        APP.scanLocked =
          false;

        APP.lastScan =
          "";

      },
      2000
    );

  }

}


/* =====================================================
   MANUAL SCAN
===================================================== */

async function manualScan() {

  const input =
    document
      .getElementById(
        "manualStudentId"
      );


  const siswaId =
    input.value.trim();


  const sessionId =
    document
      .getElementById(
        "sessionSelect"
      )
      .value;


  if (!siswaId) {

    showToast(
      "Masukkan SiswaID.",
      "error"
    );

    return;

  }


  if (!sessionId) {

    showToast(
      "Pilih sesi absensi.",
      "error"
    );

    return;

  }


  try {

    const result =
      await api(
        "scan",
        {
          token:
            APP.token,

          siswaId:
            siswaId,

          sesiId:
            sessionId
        }
      );


    showScanResult(
      result.data
    );


    input.value = "";


    showToast(
      "Absensi berhasil dicatat.",
      "success"
    );


  } catch (error) {

    showToast(
      error.message,
      "error"
    );

  }

}


/* =====================================================
   SHOW RESULT
===================================================== */

function showScanResult(
  data
) {

  const card =
    document
      .getElementById(
        "resultCard"
      );


  const name =
    document
      .getElementById(
        "resultName"
      );


  const studentId =
    document
      .getElementById(
        "resultStudentId"
      );


  const status =
    document
      .getElementById(
        "resultStatus"
      );


  const time =
    document
      .getElementById(
        "resultTime"
      );


  name.textContent =
    data.NamaLengkap ||
    "-";


  studentId.textContent =
    data.SiswaID ||
    "-";


  status.textContent =
    data.StatusAbsensi ||
    "Hadir";


  time.textContent =
    data.JamScan ||
    "-";


  card.classList.remove(
    "hidden"
  );

}


/* =====================================================
   TOAST
===================================================== */

function showToast(
  message,
  type = ""
) {

  const toast =
    document
      .getElementById(
        "toast"
      );


  toast.textContent =
    message;


  toast.className =
    "toast show " +
    type;


  clearTimeout(
    window.toastTimer
  );


  window.toastTimer =
    setTimeout(
      function() {

        toast.className =
          "toast";

      },
      3000
    );

}


/* =====================================================
   ENTER LOGIN
===================================================== */

document.addEventListener(
  "keydown",
  function(event) {

    if (
      event.key === "Enter" &&
      document
        .getElementById(
          "loginPage"
        )
        .classList
        .contains("active")
    ) {

      login();

    }

  }
);
