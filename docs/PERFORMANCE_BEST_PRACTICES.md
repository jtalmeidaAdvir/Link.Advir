# ⚡ Boas Práticas de Performance - React & React Native

## 📚 Índice

1. [Memoization](#memoization)
2. [Componentes Otimizados](#componentes-otimizados)
3. [Listas e FlatList](#listas-e-flatlist)
4. [Callbacks e Event Handlers](#callbacks-e-event-handlers)
5. [Cálculos Pesados](#cálculos-pesados)
6. [Evitar Re-renders](#evitar-re-renders)
7. [Code Splitting](#code-splitting)
8. [Imagens e Assets](#imagens-e-assets)
9. [Network e API](#network-e-api)
10. [Checklist de Performance](#checklist-de-performance)

---

## 1. Memoization

### React.memo

Use `React.memo` para componentes que renderizam frequentemente mas raramente mudam.

```javascript
// ❌ ANTES - Re-renderiza sempre que o parent renderiza
const UserCard = ({ user }) => {
    return (
        <div>
            <h3>{user.name}</h3>
            <p>{user.email}</p>
        </div>
    );
};

// ✅ DEPOIS - Só re-renderiza se user mudar
const UserCard = React.memo(({ user }) => {
    return (
        <div>
            <h3>{user.name}</h3>
            <p>{user.email}</p>
        </div>
    );
});
```

### Custom Comparison

Para objetos complexos, use comparação customizada:

```javascript
const UserCard = React.memo(
    ({ user }) => {
        return <div>{user.name}</div>;
    },
    (prevProps, nextProps) => {
        // Retornar true = NÃO re-renderizar
        // Retornar false = re-renderizar
        return prevProps.user.id === nextProps.user.id &&
               prevProps.user.name === nextProps.user.name;
    }
);
```

### useMemo

Cache cálculos pesados:

```javascript
// ❌ ANTES - Recalcula em CADA render
const Component = ({ items }) => {
    const total = items.reduce((sum, item) => sum + item.price, 0);
    const average = total / items.length;

    return <div>Média: {average}</div>;
};

// ✅ DEPOIS - Só recalcula se items mudar
const Component = ({ items }) => {
    const statistics = useMemo(() => {
        const total = items.reduce((sum, item) => sum + item.price, 0);
        const average = total / items.length;
        return { total, average };
    }, [items]);

    return <div>Média: {statistics.average}</div>;
};
```

### useCallback

Evite recriar funções em cada render:

```javascript
// ❌ ANTES - Nova função em cada render
const Component = ({ onSave }) => {
    const handleClick = () => {
        console.log('Saving...');
        onSave();
    };

    return <Button onClick={handleClick} />;
};

// ✅ DEPOIS - Mesma referência entre renders
const Component = ({ onSave }) => {
    const handleClick = useCallback(() => {
        console.log('Saving...');
        onSave();
    }, [onSave]);

    return <Button onClick={handleClick} />;
};
```

---

## 2. Componentes Otimizados

### Separar Componentes Grandes

```javascript
// ❌ ANTES - Um componente gigante
const Dashboard = () => {
    const [users, setUsers] = useState([]);
    const [products, setProducts] = useState([]);
    const [orders, setOrders] = useState([]);

    return (
        <div>
            <div>{/* Renderizar users */}</div>
            <div>{/* Renderizar products */}</div>
            <div>{/* Renderizar orders */}</div>
        </div>
    );
};

// ✅ DEPOIS - Componentes separados e memoizados
const UsersList = React.memo(({ users }) => {
    return <div>{/* Renderizar users */}</div>;
});

const ProductsList = React.memo(({ products }) => {
    return <div>{/* Renderizar products */}</div>;
});

const OrdersList = React.memo(({ orders }) => {
    return <div>{/* Renderizar orders */}</div>;
});

const Dashboard = () => {
    const [users, setUsers] = useState([]);
    const [products, setProducts] = useState([]);
    const [orders, setOrders] = useState([]);

    return (
        <div>
            <UsersList users={users} />
            <ProductsList products={products} />
            <OrdersList orders={orders} />
        </div>
    );
};
```

### Evitar Inline Objects/Arrays

```javascript
// ❌ ANTES - Cria novo objeto em cada render
<UserCard
    user={user}
    style={{ padding: 10, margin: 5 }}
    colors={['red', 'blue', 'green']}
/>

// ✅ DEPOIS - Reutiliza mesmas referências
const cardStyle = { padding: 10, margin: 5 };
const colorPalette = ['red', 'blue', 'green'];

<UserCard
    user={user}
    style={cardStyle}
    colors={colorPalette}
/>

// OU com useMemo para valores dinâmicos
const cardStyle = useMemo(() => ({
    padding: isMobile ? 5 : 10,
    margin: isMobile ? 2 : 5
}), [isMobile]);
```

---

## 3. Listas e FlatList

### Usar FlatList (React Native)

```javascript
// ❌ ANTES - ScrollView com .map()
<ScrollView>
    {items.map(item => (
        <ItemCard key={item.id} item={item} />
    ))}
</ScrollView>

// ✅ DEPOIS - FlatList com virtualização
<FlatList
    data={items}
    keyExtractor={item => item.id.toString()}
    renderItem={({ item }) => <ItemCard item={item} />}
    initialNumToRender={10}
    maxToRenderPerBatch={10}
    windowSize={5}
    removeClippedSubviews={true}
/>
```

### Otimizar Items de Lista

```javascript
// Criar componente memoizado para items
const ItemCard = React.memo(({ item }) => {
    return (
        <View>
            <Text>{item.name}</Text>
        </View>
    );
}, (prevProps, nextProps) => {
    return prevProps.item.id === nextProps.item.id &&
           prevProps.item.name === nextProps.item.name;
});

// Usar getItemLayout para listas com altura fixa
<FlatList
    data={items}
    renderItem={({ item }) => <ItemCard item={item} />}
    getItemLayout={(data, index) => ({
        length: ITEM_HEIGHT,
        offset: ITEM_HEIGHT * index,
        index,
    })}
/>
```

### Keys Únicas e Estáveis

```javascript
// ❌ ERRADO - Usar index como key
items.map((item, index) => <div key={index}>{item.name}</div>)

// ❌ ERRADO - Gerar key aleatória
items.map(item => <div key={Math.random()}>{item.name}</div>)

// ✅ CORRETO - Usar ID único e estável
items.map(item => <div key={item.id}>{item.name}</div>)
```

---

## 4. Callbacks e Event Handlers

### Definir Fora do Render

```javascript
// ❌ ANTES
const List = ({ items }) => {
    return items.map(item => (
        <button
            key={item.id}
            onClick={() => console.log(item.id)}
        >
            {item.name}
        </button>
    ));
};

// ✅ DEPOIS
const List = ({ items }) => {
    const handleClick = useCallback((id) => {
        console.log(id);
    }, []);

    return items.map(item => (
        <button
            key={item.id}
            onClick={() => handleClick(item.id)}
        >
            {item.name}
        </button>
    ));
};
```

### Usar Data Attributes (Web)

```javascript
// ✅ MELHOR AINDA - Um único handler
const List = ({ items }) => {
    const handleClick = useCallback((e) => {
        const id = e.currentTarget.dataset.id;
        console.log(id);
    }, []);

    return items.map(item => (
        <button
            key={item.id}
            data-id={item.id}
            onClick={handleClick}
        >
            {item.name}
        </button>
    ));
};
```

---

## 5. Cálculos Pesados

### Mover para useMemo

```javascript
// ❌ ANTES
const Statistics = ({ data }) => {
    const total = data.reduce((sum, item) => sum + item.value, 0);
    const average = total / data.length;
    const max = Math.max(...data.map(item => item.value));
    const min = Math.min(...data.map(item => item.value));

    return <div>...</div>;
};

// ✅ DEPOIS
const Statistics = ({ data }) => {
    const stats = useMemo(() => {
        const total = data.reduce((sum, item) => sum + item.value, 0);
        const average = total / data.length;
        const values = data.map(item => item.value);
        const max = Math.max(...values);
        const min = Math.min(...values);

        return { total, average, max, min };
    }, [data]);

    return <div>...</div>;
};
```

### Web Workers para Operações Muito Pesadas

```javascript
// worker.js
self.addEventListener('message', (e) => {
    const result = heavyCalculation(e.data);
    self.postMessage(result);
});

// Component.js
const Component = ({ data }) => {
    const [result, setResult] = useState(null);

    useEffect(() => {
        const worker = new Worker('worker.js');

        worker.postMessage(data);

        worker.onmessage = (e) => {
            setResult(e.data);
        };

        return () => worker.terminate();
    }, [data]);

    return <div>{result}</div>;
};
```

---

## 6. Evitar Re-renders

### React DevTools Profiler

```javascript
// Adicionar no código para debug
import { Profiler } from 'react';

<Profiler id="UserList" onRender={onRenderCallback}>
    <UserList users={users} />
</Profiler>

function onRenderCallback(
    id,
    phase,
    actualDuration,
    baseDuration,
    startTime,
    commitTime,
) {
    console.log(`${id} (${phase}) took ${actualDuration}ms`);
}
```

### useState vs useReducer

```javascript
// ❌ Para múltiplos states relacionados
const [name, setName] = useState('');
const [email, setEmail] = useState('');
const [phone, setPhone] = useState('');
const [address, setAddress] = useState('');

// ✅ MELHOR - Um único reducer
const [formData, dispatch] = useReducer(formReducer, {
    name: '',
    email: '',
    phone: '',
    address: ''
});

function formReducer(state, action) {
    switch (action.type) {
        case 'UPDATE_FIELD':
            return { ...state, [action.field]: action.value };
        default:
            return state;
    }
}
```

### Context API Otimizado

```javascript
// ❌ ANTES - Todo mundo re-renderiza
const AppContext = createContext();

const AppProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [theme, setTheme] = useState('light');
    const [settings, setSettings] = useState({});

    return (
        <AppContext.Provider value={{ user, setUser, theme, setTheme, settings, setSettings }}>
            {children}
        </AppContext.Provider>
    );
};

// ✅ DEPOIS - Separar contextos
const UserContext = createContext();
const ThemeContext = createContext();
const SettingsContext = createContext();

// Componentes só subscribem ao que precisam
```

---

## 7. Code Splitting

### React.lazy e Suspense

```javascript
// ❌ ANTES - Tudo carregado no início
import UserDashboard from './UserDashboard';
import AdminPanel from './AdminPanel';
import Reports from './Reports';

// ✅ DEPOIS - Lazy loading
const UserDashboard = React.lazy(() => import('./UserDashboard'));
const AdminPanel = React.lazy(() => import('./AdminPanel'));
const Reports = React.lazy(() => import('./Reports'));

const App = () => (
    <Suspense fallback={<Loading />}>
        <Routes>
            <Route path="/dashboard" element={<UserDashboard />} />
            <Route path="/admin" element={<AdminPanel />} />
            <Route path="/reports" element={<Reports />} />
        </Routes>
    </Suspense>
);
```

### Route-based Splitting

```javascript
// App.js
const routes = [
    {
        path: '/assiduidade',
        component: React.lazy(() => import('./Pages/Assiduidade'))
    },
    {
        path: '/obras',
        component: React.lazy(() => import('./Pages/Obras'))
    },
    {
        path: '/servicos',
        component: React.lazy(() => import('./Pages/Servicos'))
    }
];
```

---

## 8. Imagens e Assets

### Otimizar Imagens

```javascript
// ❌ ANTES - Imagem grande original
<img src="/logo.png" width="50" />

// ✅ DEPOIS - Versões otimizadas
<img
    src="/logo-50.webp"
    srcSet="/logo-50.webp 1x, /logo-100.webp 2x"
    alt="Logo"
/>

// React Native
<Image
    source={require('./logo.png')}
    style={{ width: 50, height: 50 }}
    resizeMode="contain"
/>
```

### Lazy Load de Imagens

```javascript
const LazyImage = ({ src, alt }) => {
    const [imageSrc, setImageSrc] = useState(null);
    const imgRef = useRef();

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setImageSrc(src);
                    observer.disconnect();
                }
            },
            { threshold: 0.1 }
        );

        if (imgRef.current) {
            observer.observe(imgRef.current);
        }

        return () => observer.disconnect();
    }, [src]);

    return <img ref={imgRef} src={imageSrc || placeholder} alt={alt} />;
};
```

---

## 9. Network e API

### Cancelar Requests

```javascript
const Component = () => {
    const [data, setData] = useState(null);

    useEffect(() => {
        const controller = new AbortController();

        fetch('/api/data', { signal: controller.signal })
            .then(res => res.json())
            .then(setData)
            .catch(err => {
                if (err.name !== 'AbortError') {
                    console.error(err);
                }
            });

        return () => controller.abort();
    }, []);

    return <div>{data}</div>;
};
```

### Debounce de Inputs

```javascript
const SearchInput = () => {
    const [query, setQuery] = useState('');

    // Debounce search
    const debouncedSearch = useMemo(
        () => debounce((value) => {
            // API call aqui
            fetch(`/api/search?q=${value}`);
        }, 500),
        []
    );

    const handleChange = (e) => {
        const value = e.target.value;
        setQuery(value);
        debouncedSearch(value);
    };

    return <input value={query} onChange={handleChange} />;
};

// Utility
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
```

### Cache de Requests

```javascript
const cache = new Map();

const useCachedFetch = (url, ttl = 5 * 60 * 1000) => {
    const [data, setData] = useState(null);

    useEffect(() => {
        const cached = cache.get(url);

        if (cached && Date.now() - cached.timestamp < ttl) {
            setData(cached.data);
            return;
        }

        fetch(url)
            .then(res => res.json())
            .then(data => {
                cache.set(url, { data, timestamp: Date.now() });
                setData(data);
            });
    }, [url, ttl]);

    return data;
};
```

---

## 10. Checklist de Performance

### ✅ Antes de Fazer Commit

- [ ] Componentes grandes (>500 linhas) divididos?
- [ ] Listas usam `key` única e estável?
- [ ] Listas grandes usam FlatList/virtualização?
- [ ] Cálculos pesados em `useMemo`?
- [ ] Event handlers em `useCallback`?
- [ ] Componentes de lista com `React.memo`?
- [ ] Sem inline objects/arrays em props?
- [ ] Imagens otimizadas?
- [ ] Routes com code splitting?
- [ ] Console.logs removidos?

### ✅ Antes de Deploy

- [ ] React DevTools Profiler executado?
- [ ] Lighthouse score > 90?
- [ ] Bundle size analisado?
- [ ] Lazy loading implementado?
- [ ] Cache de API configurado?
- [ ] Error boundaries adicionados?
- [ ] Loading states em todas as operações async?
- [ ] Performance metrics configurados?

### 🔍 Sinais de Problemas

- Interface lenta/travada ao scrollar
- Delay ao digitar em inputs
- Re-renders visíveis (flash de conteúdo)
- Tempo de carregamento > 3 segundos
- Bundle size > 500KB
- Memory leaks (verificar DevTools)

### 🛠️ Ferramentas

- **React DevTools Profiler** - Identificar re-renders
- **Chrome DevTools Performance** - Analisar runtime
- **Lighthouse** - Score geral de performance
- **webpack-bundle-analyzer** - Tamanho do bundle
- **why-did-you-render** - Debug de re-renders

---

## 📚 Recursos

- [React Performance Optimization](https://react.dev/learn/render-and-commit)
- [React Native Performance](https://reactnative.dev/docs/performance)
- [Web Vitals](https://web.dev/vitals/)
- [JavaScript Performance](https://developer.mozilla.org/en-US/docs/Web/Performance)

---

**Atualizado**: 2025-12-30
**Versão**: 1.0
