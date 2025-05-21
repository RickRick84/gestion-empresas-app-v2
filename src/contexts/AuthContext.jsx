import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth, db } from "../../firebaseConfig";
import { doc, getDoc, setDoc } from "firebase/firestore";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [rol, setRol] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          const uid = firebaseUser.uid;
          const userRef = doc(db, "usuarios", uid);
          const docSnap = await getDoc(userRef);

          if (docSnap.exists()) {
            setRol(docSnap.data().rol || "empleado");
          } else {
            await setDoc(userRef, {
              email: firebaseUser.email,
              rol: "empleado",
            });
            setRol("empleado");
          }

          setUser(firebaseUser);
        } else {
          setUser(null);
          setRol(null);
        }
      } catch (err) {
        console.error("❌ Error en AuthContext useEffect:", err);
        setUser(null);
        setRol(null);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setRol(null);
    } catch (error) {
      console.error("❌ Error al cerrar sesión:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, rol, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
