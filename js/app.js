        // ── Legal page helpers ──
        function openLegal(tab) {
            switchLegalTab(tab);
            switchView('legalView');
        }

        function switchLegalTab(tab, btnEl) {
            const privacy = document.getElementById('legal-privacy');
            const tos     = document.getElementById('legal-tos');
            if (privacy) privacy.style.display = tab === 'privacy' ? '' : 'none';
            if (tos)     tos.style.display     = tab === 'tos'     ? '' : 'none';
            // Update tab button active states
            document.querySelectorAll('.legal-tab').forEach(b => b.classList.remove('active'));
            if (btnEl) {
                btnEl.classList.add('active');
            } else {
                document.querySelectorAll('.legal-tab').forEach(b => {
                    if ((tab === 'privacy' && b.textContent.includes('Privacy')) ||
                        (tab === 'tos'     && b.textContent.includes('Terms'))) {
                        b.classList.add('active');
                    }
                });
            }
            // Scroll to top
            const content = document.querySelector('.legal-content');
            if (content) content.scrollTop = 0;
        }

        // ── Navigation: which views belong to which tab ──
        const VIEW_TAB = {
            dashboardView:     'home',
            feedView:          'home',
            discoverView:      'discover',
            profileDetailView: 'discover',
            messagesView:      'chats',
            inboxView:         'chats',
            scheduleView:      'chats',
            calendarView:      'chats',
            callView:          'chats',
            networkView:       'network',
            groupsView:        'network',
            groupDetailView:   'network',
            myProfileView:     'profile',
            settingsView:      'profile',
            availabilityView:  'profile',
            legalView:         '',
        };

        // ── 5 primary tabs ──
        const NAV_TABS = [
            { id: 'home',     icon: '🏠', label: 'Home',     view: 'dashboardView' },
            { id: 'discover', icon: '🔍', label: 'Discover', view: 'discoverView'  },
            { id: 'chats',    icon: '☕', label: 'Chats',    view: 'messagesView'  },
            { id: 'network',  icon: '🤝', label: 'Network',  view: 'networkView'   },
            { id: 'profile',  icon: '👤', label: 'Profile',  view: 'myProfileView' },
        ];

        // Supabase Configuration
        const SUPABASE_URL = 'https://vmrmkkngjlicuvrpejxx.supabase.co';
        const SUPABASE_ANON_KEY = 'sb_publishable_UZ6aNCU1qZ5TfGCHXdPz4w_ferczbVL';

        // Initialize Supabase client
        const { createClient } = supabase;
        const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

        // State
        let currentUser = null;
        let _myProfilePreviewData = null;
        let users = [];
        let groups = [];
        let myGroupIds = new Set();
        let sentMessageCount = 0;
        let messages = [];
        let meetings = [];
        let connections = [];
        let pendingRequests = []; // incoming connection requests (from pending_requests view)
        let sentRequests = [];    // outgoing: user_id === currentUser.id, status === 'pending'
        let chatInvites = [];     // incoming coffee chat invites (from pending_requests view, type === 'chat_invite')
        let sentChatInvites = []; // outgoing chat invites sent by current user, status === 'pending'
        let realtimeChannels = [];
        let pollingTimer = null;
        let posts = [];
        let selectedConversation = null;
        let selectedConversationId = null; // conversation_id from conversations table
        let selectedPerson = null;
        let previousView = 'dashboardView';
        let callDuration = 0;
        let callInterval = null;
        let currentMonth = new Date();
        let selectedTime = null;

        const mockUsers = [
            {
                id: '00000000-0000-0000-0000-000000000002',
                firstName: 'Jordan',
                lastName: 'Torres',
                industry: 'Business/Finance',
                interests: ['Fintech', 'Investing', 'Entrepreneurship'],
                hobbies: ['Working out', 'Basketball', 'Traveling'],
                goals: 'Land an investment banking internship and eventually start a fintech company',
                email: 'torresj@rowan.edu',
                bio: 'Finance major in the Rohrer College of Business and president of the Investing Club. Interned at a boutique advisory firm last summer. Always down to talk markets over coffee.',
                role: 'Junior',
                company: 'Rowan University',
                location: '2027',
                profilePicture: null,
                resume: null,
                posts: [
                    { id: 'mock-post-001', content: 'Just got my summer internship offer! Happy to share tips on the recruiting process with anyone at Rowan who\'s going through it.', date: '2 days ago', likes_count: 24 }
                ]
            },
            {
                id: '00000000-0000-0000-0000-000000000003',
                firstName: 'Anika',
                lastName: 'Patel',
                industry: 'Computer Science/Tech',
                interests: ['AI', 'Product Management', 'Startups'],
                hobbies: ['Reading', 'Hiking', 'Photography'],
                goals: 'Break into product management at a top tech company',
                email: 'patela@rowan.edu',
                bio: 'CS major with a passion for AI and product design. Working on a campus app for Rowan students to find study groups. Looking for mentors in PM and anyone building cool side projects.',
                role: 'Senior',
                company: 'Rowan University',
                location: '2026',
                profilePicture: null,
                resume: null,
                posts: [
                    { id: 'mock-post-002', content: 'Just finished my first ML project for class and it actually works! Anyone else at Rowan diving into AI this semester?', date: '1 week ago', likes_count: 42 }
                ]
            },
            {
                id: '00000000-0000-0000-0000-000000000004',
                firstName: 'Mike',
                lastName: 'Reyes',
                industry: 'Engineering',
                interests: ['Mechanical Engineering', 'Research', 'Robotics'],
                goals: 'Get into a top engineering grad program or land a role at a defense contractor',
                email: 'reyesm@rowan.edu',
                bio: 'Mechanical Engineering sophomore in the Henry M. Rowan College of Engineering. Doing research in the robotics lab and looking for other engineering students to connect with.',
                role: 'Sophomore',
                company: 'Rowan University',
                location: '2028',
                profilePicture: null,
                resume: null,
                posts: []
            },
            {
                id: '00000000-0000-0000-0000-000000000005',
                firstName: 'Taylor',
                lastName: 'Brooks',
                industry: 'Computer Science/Tech',
                interests: ['Backend Engineering', 'Open Source', 'Web Dev'],
                goals: 'Land a software engineering role at a startup or big tech',
                email: 'brookst@rowan.edu',
                bio: 'CS sophomore who loves building things. Contributing to open source projects and working on a campus events app. Looking for hackathon teammates and study buddies at Rowan.',
                role: 'Sophomore',
                company: 'Rowan University',
                location: '2028',
                profilePicture: null,
                resume: null,
                posts: [
                    { id: 'mock-post-003', content: 'Our ProfHacks team just won first place! Here\'s what we built in 36 hours and what I learned about working under pressure.', date: '3 days ago', likes_count: 67 }
                ]
            },
            {
                id: '00000000-0000-0000-0000-000000000006',
                firstName: 'Brianna',
                lastName: 'Mitchell',
                industry: 'Business/Finance',
                interests: ['Marketing', 'Content Creation', 'Brand Strategy'],
                goals: 'Break into marketing at a tech startup after graduation',
                email: 'mitchellb@rowan.edu',
                bio: 'Marketing major in Rohrer College of Business and social media manager for three campus orgs. Ran a freelance content business since freshman year. Always excited to talk branding and side hustles.',
                role: 'Recent Grad',
                company: 'Rowan University',
                location: '2025',
                profilePicture: null,
                resume: null,
                posts: []
            }
        ];

        const mockGroups = [
            {
                id: 1,
                name: 'Rowan University CS & Tech',
                industry: 'Computer Science/Tech',
                description: 'For Rowan University CS students, aspiring engineers, and anyone building cool stuff',
                members: 87,
                lastActivity: new Date(Date.now() - 2 * 60 * 60 * 1000),
                memberList: ['AP', 'TB', 'JT', 'MR', 'BM'],
                posts: [
                    { author: 'Anika Patel', content: 'Anyone working on AI projects this semester? Would love to connect and share notes!', time: new Date(Date.now() - 2 * 60 * 60 * 1000) },
                    { author: 'Taylor Brooks', content: 'Just won ProfHacks! Here are the resources that helped us build in 36 hours.', time: new Date(Date.now() - 8 * 60 * 60 * 1000) }
                ]
            },
            {
                id: 2,
                name: 'Rohrer Business & Finance',
                industry: 'Business/Finance',
                description: 'Rohrer College of Business students — recruiting tips, prep, and support',
                members: 64,
                lastActivity: new Date(Date.now() - 18 * 60 * 60 * 1000),
                memberList: ['JT', 'AP', 'BM'],
                posts: [
                    { author: 'Jordan Torres', content: 'Just finished recruiting season \u2014 happy to share what worked for me and what I\'d do differently!', time: new Date(Date.now() - 18 * 60 * 60 * 1000) }
                ]
            },
            {
                id: 3,
                name: 'Rowan University Engineering',
                industry: 'Engineering',
                description: 'Henry M. Rowan College of Engineering students and alumni',
                members: 72,
                lastActivity: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
                memberList: ['MR', 'TB'],
                posts: [
                    { author: 'Mike Reyes', content: 'Anyone else doing undergrad research in the robotics lab? Looking for partners for the spring showcase.', time: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) }
                ]
            },
            {
                id: 4,
                name: 'Rowan University Side Hustles & Startups',
                industry: 'Business/Finance',
                description: 'Rowan University student entrepreneurs, freelancers, and side project builders',
                members: 53,
                lastActivity: new Date(Date.now() - 6 * 60 * 60 * 1000),
                memberList: ['BM', 'JT', 'AP', 'TB'],
                posts: [
                    { author: 'Brianna Mitchell', content: 'Started freelancing as a content creator freshman year \u2014 here\'s how I landed my first 5 clients on campus.', time: new Date(Date.now() - 6 * 60 * 60 * 1000) }
                ]
            }
        ];

        // Map initials to mock user IDs for group member display
        const initialsToUserId = {
            'JT': '00000000-0000-0000-0000-000000000002',
            'AP': '00000000-0000-0000-0000-000000000003',
            'MR': '00000000-0000-0000-0000-000000000004',
            'TB': '00000000-0000-0000-0000-000000000005',
            'BM': '00000000-0000-0000-0000-000000000006'
        };

        // Group post interactions (local storage)
        const groupPostLikes = {};
        const groupPostComments = {};

        // Initialize
        async function init() {

            // Check for existing Supabase session
            const { data: { session } } = await supabaseClient.auth.getSession();

            if (session) {
                // User is logged in, load their profile
                await loadUserProfile(session.user.id);
                recordLogin();
                renderNav();
                switchView('dashboardView');
                await updateDashboard();
                checkBadgesWithCelebration();
            } else {
                // No session, show landing page
                document.querySelector('.app-container').classList.add('sidebar-hidden');
                switchView('landingView');
            }

            renderCalendar();

            // Re-apply theme when OS dark/light preference changes (for 'system' mode)
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
                const saved = localStorage.getItem('app_theme') || 'light';
                if (saved === 'system') applyTheme('system');
            });

            // Detect auth changes from other tabs (e.g. a different user logs in,
            // replacing the localStorage token — which would cause sender_id ≠ auth.uid() on writes)
            supabaseClient.auth.onAuthStateChange((event, session) => {
                if (event === 'SIGNED_OUT' && currentUser) {
                    // Another tab signed out — sync this tab
                    currentUser = null;
                    connections = []; meetings = []; posts = []; notifications = [];
                    realtimeChannels.forEach(ch => { try { supabaseClient.removeChannel(ch); } catch(e){} });
                    realtimeChannels = [];
                    if (pollingTimer) { clearInterval(pollingTimer); pollingTimer = null; }
                    document.querySelector('.app-container').classList.add('sidebar-hidden');
                    switchView('loginView');
                    showToast('You have been signed out.', 'info');
                } else if (event === 'SIGNED_IN' && session && currentUser && session.user.id !== currentUser.id) {
                    // A different user signed in (another tab replaced the auth token)
                    currentUser = null;
                    connections = []; meetings = []; posts = []; notifications = [];
                    realtimeChannels.forEach(ch => { try { supabaseClient.removeChannel(ch); } catch(e){} });
                    realtimeChannels = [];
                    if (pollingTimer) { clearInterval(pollingTimer); pollingTimer = null; }
                    document.querySelector('.app-container').classList.add('sidebar-hidden');
                    switchView('loginView');
                    showToast('Another account signed in. Please log in again.', 'info');
                }
            });
        }

        function suSelectChip(el, value) {
            // Single-select: deselect all chips, then select clicked one
            el.closest('.su-chips').querySelectorAll('.su-chip').forEach(c => c.classList.remove('su-chip-sel'));
            el.classList.add('su-chip-sel');
            document.getElementById('signupIndustry').value = value;
        }

        function suUpdateStrength(val) {
            const bars = [1, 2, 3, 4].map(i => document.getElementById('suBar' + i));
            bars.forEach(b => { b.className = 'su-bar'; });
            let score = 0;
            if (val.length >= 8) score++;
            if (/[A-Z]/.test(val)) score++;
            if (/[0-9]/.test(val)) score++;
            if (/[^A-Za-z0-9]/.test(val)) score++;
            const cls = ['su-s1', 'su-s2', 'su-s3', 'su-s4'];
            for (let i = 0; i < score; i++) bars[i].classList.add(cls[score - 1]);
        }

        function showLandingSignup() {
            switchView('signupView');
        }

        function showLandingLogin() {
            switchView('loginView');
        }

        function toggleMobileMenu() {
            const menu = document.getElementById('mobileMenu');
            const hamburger = document.querySelector('.hamburger');
            if (menu) { menu.classList.toggle('active'); hamburger && hamburger.classList.toggle('active'); document.body.style.overflow = menu.classList.contains('active') ? 'hidden' : ''; }
        }
        function closeMobileMenu() {
            const menu = document.getElementById('mobileMenu');
            const hamburger = document.querySelector('.hamburger');
            if (menu) { menu.classList.remove('active'); hamburger && hamburger.classList.remove('active'); document.body.style.overflow = ''; }
        }

        // New landing page mobile menu
        function toggleLpMenu() {
            const menu = document.getElementById('lpMobileMenu');
            const btn = document.getElementById('lpHamburger');
            if (!menu) return;
            menu.classList.toggle('active');
            btn && btn.classList.toggle('active');
            document.body.style.overflow = menu.classList.contains('active') ? 'hidden' : '';
        }
        function closeLpMenu() {
            const menu = document.getElementById('lpMobileMenu');
            const btn = document.getElementById('lpHamburger');
            if (!menu) return;
            menu.classList.remove('active');
            btn && btn.classList.remove('active');
            document.body.style.overflow = '';
        }

        // Scroll reveal for landing page
        function initLandingReveal() {
            const reveals = document.querySelectorAll('#landingView .reveal');
            if (!reveals.length) return;
            const obs = new IntersectionObserver((entries) => {
                entries.forEach((entry, i) => {
                    if (entry.isIntersecting) {
                        setTimeout(() => entry.target.classList.add('visible'), i * 80);
                        obs.unobserve(entry.target);
                    }
                });
            }, { threshold: 0.1 });
            reveals.forEach(el => { el.classList.remove('visible'); obs.observe(el); });

            // Feature item toggle + panel swap
            document.querySelectorAll('#landingView .lp-feature-item').forEach(item => {
                item.addEventListener('click', () => {
                    document.querySelectorAll('#landingView .lp-feature-item').forEach(i => i.classList.remove('active'));
                    item.classList.add('active');
                    const feature = item.dataset.feature;
                    document.querySelectorAll('#landingView .lp-mockup-panel').forEach(p => p.classList.remove('active'));
                    const panel = document.getElementById('lp-panel-' + feature);
                    if (panel) panel.classList.add('active');
                });
            });
        }

        async function loadUserProfile(userId) {
            try {
                const { data: profile, error } = await supabaseClient
                    .from('profiles')
                    .select('*')
                    .eq('id', userId)
                    .single();

                if (error) throw error;

                currentUser = {
                    id: profile.id,
                    firstName: profile.first_name,
                    lastName: profile.last_name,
                    email: profile.email,
                    industry: profile.industry,
                    interests: profile.interests || [],
                    hobbies: profile.hobbies || [],
                    goals: profile.goals,
                    bio: profile.bio,
                    role: profile.role,
                    company: profile.company,
                    location: profile.location,
                    headline: profile.headline || '',
                    major: profile.major || '',
                    profilePicture: profile.profile_picture || null,
                    resume: profile.resume_url || null,
                    achievements: Array.isArray(profile.achievements) ? profile.achievements : [],
                    status: profile.status || '',
                    gradYear: profile.grad_year || ''
                };

                // Load user's data
                await loadUserData();
            } catch (error) {
                console.error('Error loading profile:', error);
            }
        }

        async function loadUserData() {
            if (!currentUser) return;

            // Each section is independent — a failure in one never blocks the others

            // Load accepted connections and sent requests
            try {
                const { data: connectionsData } = await supabaseClient
                    .from('connections')
                    .select('*')
                    .or(`user_id.eq.${currentUser.id},connected_user_id.eq.${currentUser.id}`);
                const allConns = connectionsData || [];
                connections = allConns.filter(c => c.status === 'accepted');
                sentRequests = allConns.filter(c => c.status === 'pending' && c.user_id === currentUser.id);
            } catch (e) { console.error('loadUserData connections:', e); }

            // Load incoming pending requests (connections + chat invites) via the pending_requests view
            try {
                const { data: pendingData } = await supabaseClient
                    .from('pending_requests')
                    .select('*');
                const allPending = pendingData || [];
                pendingRequests = allPending.filter(p => p.type === 'connection');
                chatInvites = allPending.filter(p => p.type === 'chat_invite');
            } catch (e) { console.error('loadUserData pending_requests:', e); }

            // Load outgoing pending chat invites
            try {
                const { data: sentData } = await supabaseClient
                    .from('chat_invites')
                    .select('*')
                    .eq('sender_id', currentUser.id)
                    .eq('status', 'pending');
                sentChatInvites = sentData || [];
            } catch (e) { console.error('loadUserData sentChatInvites:', e); }

            // Load posts for feed
            try {
                const { data: postsData } = await supabaseClient
                    .from('posts')
                    .select('*')
                    .is('group_id', null)
                    .order('created_at', { ascending: false });
                posts = postsData || [];
            } catch (e) { console.error('loadUserData posts:', e); }

            // Load meetings
            try {
                const { data: meetingsData } = await supabaseClient
                    .from('meetings')
                    .select('*')
                    .or(`organizer_id.eq.${currentUser.id},participant_id.eq.${currentUser.id}`)
                    .order('start_time', { ascending: true });
                meetings = meetingsData || [];
            } catch (e) { console.error('loadUserData meetings:', e); }

            // Load persisted notifications from DB
            try {
                const { data: notifsData } = await supabaseClient
                    .from('notifications')
                    .select('*')
                    .eq('user_id', currentUser.id)
                    .order('created_at', { ascending: false })
                    .limit(30);
                if (notifsData && notifsData.length > 0) {
                    const typeIcon = { connection_request: '🤝', connection_accepted: '🎉', meeting_request: '📅', meeting_response: '☕' };
                    notifsData.forEach(n => {
                        const mapped = {
                            id: 'db-' + n.id,
                            dbId: n.id,
                            type: n.type || 'info',
                            icon: typeIcon[n.type] || '🔔',
                            text: n.title || '',
                            time: new Date(n.created_at),
                            unread: !n.read
                        };
                        if (!notifications.find(existing => existing.id === mapped.id)) {
                            notifications.push(mapped);
                        }
                    });
                    notifications.sort((a, b) => new Date(b.time) - new Date(a.time));
                }
                refreshBellBadge();
            } catch (e) { console.error('loadUserData notifications:', e); }

            // Load all other profiles for discovery — most critical
            try {
                const { data: profilesData, error: profilesError } = await supabaseClient
                    .from('profiles')
                    .select('*')
                    .neq('id', currentUser.id);
                if (profilesError) console.error('Profiles query error:', profilesError);
                users = (profilesData || []).map(p => ({
                    id: p.id,
                    firstName: p.first_name || '',
                    lastName: p.last_name || '',
                    email: p.email || '',
                    industry: p.industry || '',
                    interests: Array.isArray(p.interests) ? p.interests : [],
                    hobbies: Array.isArray(p.hobbies) ? p.hobbies : [],
                    goals: p.goals || '',
                    bio: p.bio || '',
                    role: p.role || '',
                    company: p.company || '',
                    location: p.location || '',
                    headline: p.headline || '',
                    status: p.status || '',
                    gradYear: p.grad_year || '',
                    major: p.major || '',
                    profilePicture: p.profile_picture || null,
                    bannerImage: p.banner_image || null,
                    linkedinUrl: p.linkedin_url || null,
                    resume: p.resume_url || null,
                    achievements: Array.isArray(p.achievements) ? p.achievements : [],
                    posts: []
                }));
                console.log(`Loaded ${users.length} profiles for discovery`);
            } catch (e) { console.error('loadUserData profiles:', e); }

            // Load groups
            try {
                const { data: groupsData } = await supabaseClient
                    .from('groups')
                    .select('*')
                    .order('member_count', { ascending: false });
                groups = groupsData || [];
            } catch (e) { console.error('loadUserData groups:', e); }

            // Load user's group memberships
            try {
                const { data: membershipsData } = await supabaseClient
                    .from('group_members')
                    .select('group_id')
                    .eq('user_id', currentUser.id);
                myGroupIds = new Set((membershipsData || []).map(m => m.group_id));
            } catch (e) { console.error('loadUserData memberships:', e); }

            // Count sent messages for checklist / badges
            try {
                const { count } = await supabaseClient
                    .from('messages')
                    .select('id', { count: 'exact', head: true })
                    .eq('sender_id', currentUser.id);
                sentMessageCount = count || 0;
            } catch (e) { console.error('loadUserData messages:', e); }

            // Start real-time subscriptions and polling after all data is loaded
            setupRealtime();
            startPolling();
        }

        function saveToStorage() {
            // Deprecated - keeping for backwards compatibility
            // Data is now saved directly to Supabase
        }

        // Auth
        async function handleLogin() {
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;

            if (!email || !password) {
                alert('Please fill in all fields');
                return;
            }

            try {
                // Sign in with Supabase
                const { data, error } = await supabaseClient.auth.signInWithPassword({
                    email,
                    password
                });

                if (error) throw error;

                // Fetch user profile from database
                const { data: profile, error: profileError } = await supabaseClient
                    .from('profiles')
                    .select('*')
                    .eq('id', data.user.id)
                    .maybeSingle();

                if (profileError) throw profileError;

                if (!profile) {
                    alert('No profile found for this account. Please sign up first.');
                    await supabaseClient.auth.signOut();
                    return;
                }

                currentUser = {
                    id: profile.id,
                    firstName: profile.first_name,
                    lastName: profile.last_name,
                    email: profile.email,
                    industry: profile.industry,
                    interests: profile.interests || [],
                    hobbies: profile.hobbies || [],
                    goals: profile.goals,
                    bio: profile.bio,
                    role: profile.role,
                    company: profile.company,
                    location: profile.location,
                    headline: profile.headline || '',
                    major: profile.major || '',
                    profilePicture: profile.profile_picture || null,
                    bannerImage: profile.banner_image || null,
                    resume: profile.resume_url || null,
                    achievements: Array.isArray(profile.achievements) ? profile.achievements : [],
                    status: profile.status || '',
                    gradYear: profile.grad_year || ''
                };

                // Load all user data — setupRealtime() and startPolling() are called inside loadUserData()
                await loadUserData();

                document.querySelector('.app-container').classList.remove('sidebar-hidden');
                recordLogin();
                renderNav();
                switchView('dashboardView');
                await updateDashboard();
                checkBadgesWithCelebration();
                showToast('Welcome back!', 'success');
            } catch (error) {
                console.error('Login error:', error);
                alert('Login failed: ' + error.message);
            }
        }

        async function handleSignup() {
            const firstName = document.getElementById('signupFirstName').value;
            const lastName = document.getElementById('signupLastName').value;
            const school = 'Rowan University';
            const industry = document.getElementById('signupIndustry').value;
            const status = document.getElementById('signupStatus').value;
            const gradYear = document.getElementById('signupGradYear').value;
            const interests = document.getElementById('signupInterests').value.split(',').map(i => i.trim()).filter(Boolean);
            const goals = document.getElementById('signupGoals').value;
            const email = document.getElementById('signupEmail').value;
            const password = document.getElementById('signupPassword').value;

            if (!firstName || !lastName || !industry || !email || !password || !goals) {
                alert('Please fill in all required fields');
                return;
            }

            if (password.length < 6) {
                alert('Password must be at least 6 characters');
                return;
            }

            try {
                // Sign up with Supabase (profile is auto-created by database trigger)
                const { data, error } = await supabaseClient.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            first_name: firstName,
                            last_name: lastName,
                            industry: industry,
                            interests: interests,
                            hobbies: [],
                            goals: goals,
                            company: school,
                            role: status,
                            location: gradYear
                        }
                    }
                });

                if (error) throw error;

                // If Supabase requires email confirmation, data.session is null.
                // Show confirmation screen instead of logging in.
                if (!data.session) {
                    const el = document.getElementById('confirmEmailAddress');
                    if (el) el.textContent = email;
                    switchView('emailConfirmView');
                    return;
                }

                currentUser = {
                    id: data.user.id,
                    firstName,
                    lastName,
                    email,
                    industry,
                    interests,
                    hobbies: [],
                    goals,
                    bio: '',
                    role: status,
                    company: school,
                    location: gradYear,
                    profilePicture: null,
                    resume: null,
                    status: status,
                    gradYear: gradYear
                };

                // Write status and grad_year to dedicated columns (trigger only sets role/location)
                try {
                    await supabaseClient.from('profiles')
                        .update({ status, grad_year: gradYear })
                        .eq('id', data.user.id);
                } catch(e) { console.warn('Could not set status/grad_year on signup:', e); }

                document.querySelector('.app-container').classList.remove('sidebar-hidden');
                recordLogin();
                renderNav();
                switchView('dashboardView');
                await updateDashboard();
                showToast('Welcome to First Sip! ☕', 'success');
            } catch (error) {
                console.error('Signup error:', error);
                alert('Signup failed: ' + error.message);
            }
        }

        // ===== REAL-TIME & POLLING =====

        function pushLiveNotification(notif) {
            if (notifications.find(n => n.id === notif.id)) return; // dedupe
            notifications.unshift(notif);
            renderNotifications();
        }

        function setupRealtime() {
            if (!currentUser) return;
            // Remove any existing channels first
            realtimeChannels.forEach(ch => { try { supabaseClient.removeChannel(ch); } catch(e){} });
            realtimeChannels = [];

            // 1. Incoming connection requests
            const chConnIn = supabaseClient
                .channel('conn-in-' + currentUser.id)
                .on('postgres_changes', {
                    event: 'INSERT', schema: 'public', table: 'connections',
                    filter: `connected_user_id=eq.${currentUser.id}`
                }, async (payload) => {
                    const req = payload.new;
                    if (req.status !== 'pending' || pendingRequests.find(r => r.id === req.id)) return;
                    pendingRequests.push(req);
                    let name = 'Someone';
                    const cached = users.find(u => u.id === req.user_id);
                    if (cached) { name = `${cached.firstName} ${cached.lastName}`; }
                    else {
                        try {
                            const { data: p } = await supabaseClient.from('profiles').select('first_name,last_name').eq('id', req.user_id).single();
                            if (p) name = `${p.first_name} ${p.last_name}`;
                        } catch(e) {}
                    }
                    pushLiveNotification({ id: 'pending-' + req.id, type: 'connection', icon: '🤝',
                        text: `${name} wants to connect with you`, time: new Date(), unread: true,
                        action: () => switchView('dashboardView') });
                    showToast(`${name} sent you a connection request!`, 'info');
                    if (document.getElementById('dashboardView').classList.contains('active')) updateDashboard();
                })
                .subscribe();
            realtimeChannels.push(chConnIn);

            // 2. My outgoing request accepted
            const chConnAccepted = supabaseClient
                .channel('conn-accepted-' + currentUser.id)
                .on('postgres_changes', {
                    event: 'UPDATE', schema: 'public', table: 'connections',
                    filter: `user_id=eq.${currentUser.id}`
                }, (payload) => {
                    const updated = payload.new;
                    if (updated.status !== 'accepted') return;
                    sentRequests = sentRequests.filter(r => r.id !== updated.id);
                    if (!connections.find(c => c.id === updated.id)) connections.push(updated);
                    const partner = users.find(u => u.id === updated.connected_user_id);
                    const name = partner ? `${partner.firstName} ${partner.lastName}` : 'Someone';
                    pushLiveNotification({ id: 'accepted-' + updated.id, type: 'connection', icon: '🎉',
                        text: `${name} accepted your connection request!`, time: new Date(), unread: true });
                    showToast(`${name} accepted your connection request! 🎉`, 'success');
                    if (document.getElementById('dashboardView').classList.contains('active')) updateDashboard();
                    renderDiscovery();
                })
                .subscribe();
            realtimeChannels.push(chConnAccepted);

            // 3. Incoming meeting invites
            const chMeetingIn = supabaseClient
                .channel('meeting-in-' + currentUser.id)
                .on('postgres_changes', {
                    event: 'INSERT', schema: 'public', table: 'meetings',
                    filter: `participant_id=eq.${currentUser.id}`
                }, async (payload) => {
                    const meeting = payload.new;
                    if (meetings.find(m => m.id === meeting.id)) return;
                    meetings.push(meeting);
                    let name = 'Someone';
                    const organizer = users.find(u => u.id === meeting.organizer_id);
                    if (organizer) { name = `${organizer.firstName} ${organizer.lastName}`; }
                    else {
                        try {
                            const { data: p } = await supabaseClient.from('profiles').select('first_name,last_name').eq('id', meeting.organizer_id).single();
                            if (p) name = `${p.first_name} ${p.last_name}`;
                        } catch(e) {}
                    }
                    pushLiveNotification({ id: 'meeting-invite-' + meeting.id, type: 'meeting', icon: '📅',
                        text: `${name} invited you to a coffee chat!`, time: new Date(), unread: true,
                        action: () => switchView('dashboardView') });
                    showToast(`${name} invited you to a coffee chat! ☕`, 'info');
                    if (document.getElementById('dashboardView').classList.contains('active')) updateDashboard();
                })
                .subscribe();
            realtimeChannels.push(chMeetingIn);

            // 4. Notifications table — persist and show DB-generated notifications
            const chNotifs = supabaseClient
                .channel('notifs-' + currentUser.id)
                .on('postgres_changes', {
                    event: 'INSERT', schema: 'public', table: 'notifications',
                    filter: `user_id=eq.${currentUser.id}`
                }, (payload) => {
                    const n = payload.new;
                    const typeIcon = { connection_request: '🤝', connection_accepted: '🎉', meeting_request: '📅', meeting_response: '☕' };
                    pushLiveNotification({
                        id: 'db-' + n.id,
                        dbId: n.id,
                        type: n.type || 'info',
                        icon: typeIcon[n.type] || '🔔',
                        text: n.title || '',
                        time: new Date(n.created_at),
                        unread: true
                    });
                })
                .subscribe();
            realtimeChannels.push(chNotifs);

            // 5. Meeting updates — organizer learns when their invite is accepted/declined
            const chMeetingUpdate = supabaseClient
                .channel('meeting-update-' + currentUser.id)
                .on('postgres_changes', {
                    event: 'UPDATE', schema: 'public', table: 'meetings',
                    filter: `organizer_id=eq.${currentUser.id}`
                }, (payload) => {
                    const updated = payload.new;
                    const idx = meetings.findIndex(m => m.id === updated.id);
                    if (idx >= 0) meetings[idx] = updated; else meetings.push(updated);
                    const partner = users.find(u => u.id === updated.participant_id);
                    const name = partner ? `${partner.firstName} ${partner.lastName}` : 'Someone';
                    if (updated.status === 'accepted') {
                        pushLiveNotification({ id: 'mtg-acc-' + updated.id, type: 'meeting', icon: '🎉',
                            text: `${name} accepted your coffee chat invite!`, time: new Date(), unread: true });
                        showToast(`${name} accepted your chat invite! ☕🎉`, 'success');
                    } else if (updated.status === 'declined') {
                        pushLiveNotification({ id: 'mtg-dec-' + updated.id, type: 'meeting', icon: '😔',
                            text: `${name} declined your coffee chat invite.`, time: new Date(), unread: true });
                        showToast(`${name} declined your chat invite.`, 'info');
                    }
                    if (document.getElementById('dashboardView')?.classList.contains('active')) updateDashboard();
                    renderMeetingCards();
                })
                .subscribe();
            realtimeChannels.push(chMeetingUpdate);

            // 6. Incoming chat invites
            const chChatInvite = supabaseClient
                .channel('chat-invite-in-' + currentUser.id)
                .on('postgres_changes', {
                    event: 'INSERT', schema: 'public', table: 'chat_invites',
                    filter: `receiver_id=eq.${currentUser.id}`
                }, async (payload) => {
                    const invite = payload.new;
                    if (invite.status !== 'pending' || chatInvites.find(i => i.id === invite.id)) return;
                    chatInvites.push(invite);
                    let name = 'Someone';
                    const cached = users.find(u => u.id === invite.sender_id);
                    if (cached) { name = `${cached.firstName} ${cached.lastName}`; }
                    else {
                        try {
                            const { data: p } = await supabaseClient.from('profiles').select('first_name,last_name').eq('id', invite.sender_id).single();
                            if (p) name = `${p.first_name} ${p.last_name}`;
                        } catch(e) {}
                    }
                    pushLiveNotification({ id: 'cinvite-' + invite.id, type: 'chat_invite', icon: '☕',
                        text: `${name} wants to have a coffee chat!`, time: new Date(), unread: true,
                        action: () => switchView('dashboardView') });
                    showToast(`${name} sent you a coffee chat request! ☕`, 'info');
                    renderHubNetworkFeed();
                    generateNotifications();
                })
                .subscribe();
            realtimeChannels.push(chChatInvite);

            // 7. Incoming messages — live delivery when receiver
            const chMsgsIn = supabaseClient
                .channel('msgs-in-' + currentUser.id)
                .on('postgres_changes', {
                    event: 'INSERT', schema: 'public', table: 'messages',
                    filter: `receiver_id=eq.${currentUser.id}`
                }, async (payload) => {
                    const msg = payload.new;
                    // If the chat window for this sender is open, refresh the conversation
                    if (selectedConversation === msg.sender_id) {
                        // Refresh the active conversation in whichever view is open
                        if (document.getElementById('inboxView')?.classList.contains('active')) {
                            await selectInboxConv(msg.sender_id, msg.conversation_id);
                        } else {
                            await selectConversation(msg.sender_id, msg.conversation_id);
                        }
                    } else {
                        let name = 'Someone';
                        const cached = users.find(u => u.id === msg.sender_id);
                        if (cached) name = `${cached.firstName} ${cached.lastName}`;
                        showToast(`New message from ${name}`, 'info');
                    }
                    // Refresh the inbox list to update unread counts
                    if (document.getElementById('inboxView')?.classList.contains('active')) {
                        renderInboxView();
                    }
                })
                .subscribe();
            realtimeChannels.push(chMsgsIn);

            // 8. Conversation updates — when participant_b receives a new thread
            const chConvA = supabaseClient
                .channel('conv-as-a-' + currentUser.id)
                .on('postgres_changes', {
                    event: 'INSERT', schema: 'public', table: 'conversations',
                    filter: `participant_a=eq.${currentUser.id}`
                }, () => {
                    if (document.getElementById('inboxView')?.classList.contains('active')) renderInboxView();
                })
                .subscribe();
            realtimeChannels.push(chConvA);

            const chConvB = supabaseClient
                .channel('conv-as-b-' + currentUser.id)
                .on('postgres_changes', {
                    event: 'INSERT', schema: 'public', table: 'conversations',
                    filter: `participant_b=eq.${currentUser.id}`
                }, () => {
                    if (document.getElementById('inboxView')?.classList.contains('active')) renderInboxView();
                })
                .subscribe();
            realtimeChannels.push(chConvB);
        }

        function startPolling() {
            if (pollingTimer) clearInterval(pollingTimer);
            pollingTimer = setInterval(async () => {
                if (!currentUser) return;

                try {
                    const { data: connsData } = await supabaseClient
                        .from('connections').select('*')
                        .or(`user_id.eq.${currentUser.id},connected_user_id.eq.${currentUser.id}`);
                    if (connsData) {
                        const newAccepted = connsData.filter(c => c.status === 'accepted');

                        // Surface newly accepted connections
                        newAccepted.forEach(conn => {
                            if (conn.user_id === currentUser.id && !connections.find(c => c.id === conn.id)) {
                                const partner = users.find(u => u.id === conn.connected_user_id);
                                const name = partner ? `${partner.firstName} ${partner.lastName}` : 'Someone';
                                pushLiveNotification({ id: 'accepted-' + conn.id, type: 'connection', icon: '🎉',
                                    text: `${name} accepted your connection request!`, time: new Date(conn.updated_at || conn.created_at), unread: true });
                            }
                        });

                        connections = newAccepted;
                        sentRequests = connsData.filter(c => c.status === 'pending' && c.user_id === currentUser.id);
                    }
                } catch(e) {}

                // Refresh incoming pending requests (connections + chat invites) via view
                try {
                    const { data: pendingData } = await supabaseClient
                        .from('pending_requests').select('*');
                    if (pendingData) {
                        const newConnReqs = pendingData.filter(p => p.type === 'connection');
                        const newChatInvites = pendingData.filter(p => p.type === 'chat_invite');

                        // Surface newly arrived connection requests
                        newConnReqs.forEach(req => {
                            if (!pendingRequests.find(r => r.id === req.id)) {
                                const senderId = req.sender_id || req.user_id;
                                const cached = users.find(u => u.id === senderId);
                                const name = cached ? `${cached.firstName} ${cached.lastName}` : 'Someone';
                                pushLiveNotification({ id: 'pending-' + req.id, type: 'connection', icon: '🤝',
                                    text: `${name} wants to connect with you`, time: new Date(req.created_at), unread: true,
                                    action: () => switchView('dashboardView') });
                            }
                        });

                        // Surface newly arrived chat invites
                        newChatInvites.forEach(invite => {
                            if (!chatInvites.find(i => i.id === invite.id)) {
                                const cached = users.find(u => u.id === invite.sender_id);
                                const name = cached ? `${cached.firstName} ${cached.lastName}` : 'Someone';
                                pushLiveNotification({ id: 'cinvite-' + invite.id, type: 'chat_invite', icon: '☕',
                                    text: `${name} wants to have a coffee chat!`, time: new Date(invite.created_at), unread: true,
                                    action: () => switchView('dashboardView') });
                            }
                        });

                        pendingRequests = newConnReqs;
                        chatInvites = newChatInvites;
                    }
                } catch(e) {}

                try {
                    const { data: meetingsData } = await supabaseClient
                        .from('meetings').select('*')
                        .or(`organizer_id.eq.${currentUser.id},participant_id.eq.${currentUser.id}`)
                        .order('start_time', { ascending: true });
                    if (meetingsData) {
                        meetingsData.forEach(m => {
                            if (m.participant_id === currentUser.id && !meetings.find(ex => ex.id === m.id)) {
                                const organizer = users.find(u => u.id === m.organizer_id);
                                const name = organizer ? `${organizer.firstName} ${organizer.lastName}` : 'Someone';
                                pushLiveNotification({ id: 'meeting-invite-' + m.id, type: 'meeting', icon: '📅',
                                    text: `${name} invited you to a coffee chat!`, time: new Date(m.created_at), unread: true,
                                    action: () => switchView('dashboardView') });
                            }
                        });
                        meetings = meetingsData;
                    }
                } catch(e) {}

                if (document.getElementById('dashboardView').classList.contains('active')) updateDashboard();
            }, 30000);
        }

        async function handleLogout() {
            try {
                const { error } = await supabaseClient.auth.signOut();
                if (error) throw error;

                // Tear down real-time channels and polling
                realtimeChannels.forEach(ch => { try { supabaseClient.removeChannel(ch); } catch(e){} });
                realtimeChannels = [];
                if (pollingTimer) { clearInterval(pollingTimer); pollingTimer = null; }

                currentUser = null;
                connections = [];
                messages = [];
                meetings = [];
                posts = [];
                pendingRequests = [];
                sentRequests = [];
                chatInvites = [];
                sentChatInvites = [];
                selectedConversation = null;
                selectedConversationId = null;
                document.querySelector('.app-container').classList.add('sidebar-hidden');
                switchView('landingView');
                renderNav();
            } catch (error) {
                console.error('Logout error:', error);
                alert('Logout failed: ' + error.message);
            }
        }

        // Navigation
        function renderNav() {
            const topbar      = document.getElementById('appTopbar');
            const bellContainer = document.getElementById('notifBellContainer');
            const userChip    = document.getElementById('topbarUserChip');
            const logoutBtn   = document.getElementById('logoutBtn');
            const mainNav     = document.getElementById('mainNav');

            if (currentUser) {
                document.body.classList.add('app-mode');
                if (topbar)       topbar.classList.add('visible');
                if (bellContainer) bellContainer.style.display = 'flex';
                if (logoutBtn)    logoutBtn.style.display = 'flex';
                if (userChip) {
                    userChip.style.display = 'flex';
                    const initials = ((currentUser.firstName||'')[0]||'') + ((currentUser.lastName||'')[0]||'');
                    document.getElementById('topbarUserAv').textContent = initials.toUpperCase();
                    document.getElementById('topbarUserName').textContent =
                        (currentUser.firstName || '') + ' ' + (currentUser.lastName ? currentUser.lastName[0] + '.' : '');
                }

                // Build desktop 5-tab nav
                if (mainNav) {
                    mainNav.innerHTML = NAV_TABS.map(t => `
                        <button class="main-nav-tab" data-tab="${t.id}" onclick="switchView('${t.view}')">
                            <span class="main-nav-tab-icon">${t.icon}</span>
                            <span class="main-nav-tab-label">${t.label}</span>
                        </button>`).join('');
                }
            } else {
                document.body.classList.remove('app-mode');
                if (topbar)       topbar.classList.remove('visible');
                if (bellContainer) bellContainer.style.display = 'none';
                if (logoutBtn)    logoutBtn.style.display = 'none';
                if (userChip)     userChip.style.display = 'none';
                if (mainNav)      mainNav.innerHTML = '';
            }
        }

        function updateNavActive(viewId) {
            const activeTab = VIEW_TAB[viewId] || '';
            document.querySelectorAll('.main-nav-tab').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.tab === activeTab);
            });
            document.querySelectorAll('.mob-nav-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.tab === activeTab);
            });
        }

        function switchView(viewId) {
            document.querySelectorAll('.content-view').forEach(v => v.classList.remove('active'));
            document.getElementById(viewId).classList.add('active');

            // settingsView lives outside main-content in the flex layout;
            // hide main-content when settings is open so settingsView fills the space
            const _mc = document.getElementById('mainContent');
            if (_mc) _mc.style.display = (viewId === 'settingsView') ? 'none' : '';

            if (viewId === 'discoverView') {
                // Always re-fetch profiles so newly created accounts appear immediately
                renderDiscovery(); // render with current data right away
                if (currentUser) {
                    supabaseClient.from('profiles').select('*').neq('id', currentUser.id)
                        .then(({ data, error }) => {
                            if (error) { console.error('Discover profile refresh:', error); return; }
                            if (data) {
                                users = data.map(p => ({
                                    id: p.id,
                                    firstName: p.first_name || '',
                                    lastName: p.last_name || '',
                                    email: p.email || '',
                                    industry: p.industry || '',
                                    interests: Array.isArray(p.interests) ? p.interests : [],
                                    hobbies: Array.isArray(p.hobbies) ? p.hobbies : [],
                                    goals: p.goals || '',
                                    bio: p.bio || '',
                                    role: p.role || '',
                                    company: p.company || '',
                                    location: p.location || '',
                                    headline: p.headline || '',
                                    status: p.status || '',
                                    gradYear: p.grad_year || '',
                                    major: p.major || '',
                                    profilePicture: p.profile_picture || null,
                                    bannerImage: p.banner_image || null,
                                    linkedinUrl: p.linkedin_url || null,
                                    resume: p.resume_url || null,
                                    achievements: Array.isArray(p.achievements) ? p.achievements : [],
                                    posts: []
                                }));
                                renderDiscovery(); // re-render with fresh data
                            }
                        });
                }
            }
            if (viewId === 'feedView') renderFeed();
            if (viewId === 'groupsView') renderGroups();
            if (viewId === 'messagesView') renderMyChatView();
            if (viewId === 'dashboardView') updateDashboard();
            if (viewId === 'calendarView') renderCalendarView();
            if (viewId === 'availabilityView') renderAvailability();
            if (viewId === 'myProfileView') renderMyProfile();
            if (viewId === 'settingsView') initSettingsPage();
            if (viewId === 'networkView') renderNetworkView();
            if (viewId === 'inboxView') renderInboxView();
            if (viewId === 'landingView') setTimeout(initLandingReveal, 50);

            updateNavActive(viewId);

            if (viewId !== 'scheduleView' && viewId !== 'profileDetailView' && viewId !== 'callView' && viewId !== 'groupDetailView' && viewId !== 'legalView') {
                previousView = viewId;
            }
        }

        function goBack() {
            switchView(previousView);
        }

        // Dashboard
        function updateDashboard() {
            if (!currentUser) return;

            // ── Greeting ──
            const hour = new Date().getHours();
            const greetingEl = document.getElementById('dbGreeting');
            if (greetingEl) greetingEl.textContent = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

            // ── Name ──
            const userNameEl = document.getElementById('userName');
            if (userNameEl) userNameEl.textContent = currentUser.firstName;

            // ── Alert pill ──
            const totalPending = (pendingRequests ? pendingRequests.length : 0) + (chatInvites ? chatInvites.length : 0);
            const alertTextEl = document.getElementById('dbAlertText');
            const alertSubEl  = document.getElementById('dbAlertSub');
            if (alertTextEl) alertTextEl.textContent = totalPending > 0
                ? `${totalPending} pending request${totalPending > 1 ? 's' : ''}`
                : 'No pending requests';
            if (alertSubEl) {
                const parts = [];
                if (pendingRequests && pendingRequests.length > 0) parts.push(`${pendingRequests.length} connection${pendingRequests.length > 1 ? 's' : ''}`);
                if (chatInvites && chatInvites.length > 0) parts.push(`${chatInvites.length} chat invite${chatInvites.length > 1 ? 's' : ''}`);
                alertSubEl.textContent = parts.length > 0 ? parts.join(' + ') : 'You\'re all caught up';
            }

            // ── Next Sip card ──
            renderDbNextSip();

            // ── Suggested matches ──
            renderDbMatches();

            // Keep legacy helpers running (hidden elements)
            renderProfileCompletion();
            renderGettingStarted();
            generateNotifications();
        }

        function renderDbSetupBar() {
            const { percentage } = getProfileCompletion();
            const hasConnection = connections.length > 0;
            const hasGroup      = myGroupIds.size > 0;
            const hasMeeting    = meetings.length > 0;

            const steps = [
                { label: 'Create account', done: true, action: null },
                { label: 'Complete profile', done: percentage >= 80, action: 'editMyProfile()' },
                { label: 'First connection', done: hasConnection, action: "switchView('discoverView')" },
                { label: 'Schedule a sip',  done: hasMeeting, action: 'openScheduleChatModal()' },
            ];

            const stepsEl = document.getElementById('dbSetupSteps');
            const ctaEl   = document.getElementById('dbSetupCta');
            const bar     = document.getElementById('dbSetupBar');
            if (!stepsEl) return;

            const allDone = steps.every(s => s.done);
            if (bar) bar.style.display = allDone ? 'none' : 'flex';

            // Determine which step is next active
            let activeIdx = steps.findIndex(s => !s.done);
            stepsEl.innerHTML = steps.map((s, i) => {
                const cls = s.done ? 'done' : i === activeIdx ? 'active' : '';
                const num = s.done ? '✓' : i + 1;
                const action = s.action ? `onclick="${s.action}"` : '';
                return `<div class="db-setup-step ${cls}" ${action}><div class="db-step-num">${num}</div>${s.label}</div>`;
            }).join('');

            // Update CTA
            if (ctaEl) {
                if (!hasConnection && activeIdx === 2) { ctaEl.textContent = 'Find People →'; ctaEl.onclick = () => switchView('discoverView'); }
                else if (!hasMeeting && activeIdx === 3) { ctaEl.textContent = 'Schedule a Sip →'; ctaEl.onclick = () => openScheduleChatModal(); }
                else { ctaEl.textContent = 'Finish Profile →'; ctaEl.onclick = () => editMyProfile(); }
            }
        }

        function renderDbNextSip() {
            const container = document.getElementById('dbNextSipCard');
            if (!container) return;

            const next = meetings
                .filter(m => m.status !== 'completed' && new Date(m.start_time || m.date) >= new Date())
                .sort((a, b) => new Date(a.start_time || a.date) - new Date(b.start_time || b.date))[0];

            if (!next) {
                container.innerHTML = `
                    <div class="db-no-sip">
                        <div class="db-no-sip-icon">☕</div>
                        <div class="db-no-sip-title">No chats scheduled yet</div>
                        <div class="db-no-sip-desc">Schedule your first coffee sip with someone in your network.</div>
                        <button class="db-no-sip-btn" onclick="openScheduleChatModal()">Schedule a Sip ↗</button>
                    </div>`;
                return;
            }

            const isOrganizer = next.organizer_id === currentUser.id;
            const partnerId   = isOrganizer ? next.participant_id : next.organizer_id;
            const partner     = users.find(u => u.id === partnerId);
            const pFirst      = partner?.firstName || 'Someone';
            const pLast       = partner?.lastName  || '';
            const initials    = (pFirst[0]||'') + (pLast[0]||'');
            const role        = partner?.role    || '';
            const company     = partner?.company || '';

            const dtRaw = next.start_time || next.date;
            let countdownStr = '';
            let dateTimeStr  = '';
            if (dtRaw) {
                const dt   = new Date(dtRaw);
                const now  = new Date();
                const diff = dt - now;
                const hoursAway = diff / 3600000;
                const daysAway  = Math.round(diff / 86400000);
                const today = new Date(); today.setHours(0,0,0,0);
                const tomorrow = new Date(today); tomorrow.setDate(today.getDate()+1);
                const dayLabel = dt.toDateString() === today.toDateString() ? 'Today' : dt.toDateString() === tomorrow.toDateString() ? 'Tomorrow' : dt.toLocaleDateString('en-US',{weekday:'long'});
                const timeStr  = next.time || dt.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'});
                dateTimeStr  = `${dayLabel} at ${timeStr}`;
                let awayLabel = '';
                if (diff > 0) {
                    if (hoursAway < 1)       awayLabel = 'very soon';
                    else if (hoursAway < 24) awayLabel = `${Math.round(hoursAway)}h away`;
                    else                     awayLabel = `${daysAway} day${daysAway !== 1 ? 's' : ''} away`;
                }
                countdownStr = awayLabel ? ` · ${awayLabel}` : '';
            }

            const meetType = next.meeting_type || next.type || 'Video Call';
            const duration = next.duration ? `${next.duration} min` : '30 min';
            const topic    = next.topic || 'Coffee Chat';
            const metaLine = [role, company].filter(Boolean).join(' · ');

            const avatarColors = ['#6b3f2a','#8b5040','#2d6a4f','#1e4d8c','#7e3ff2'];
            const avatarBg = avatarColors[Math.floor(Math.random() * avatarColors.length)];
            const meetingActionHtml = renderMeetingAction(next, isOrganizer);
            container.innerHTML = `
                <div class="db-next-chat-card">
                    <div class="db-ncc-avatar" style="background:${avatarBg}">${initials || '?'}</div>
                    <div class="db-ncc-info">
                        <div class="db-ncc-name">${pFirst} ${pLast}</div>
                        <div class="db-ncc-role">${metaLine || 'Rowan University'}</div>
                        <div class="db-ncc-meta">
                            ${dateTimeStr ? `<span class="db-meta-chip">📅 ${dateTimeStr}</span>` : ''}
                            <span class="db-meta-chip">⏱ ${duration}</span>
                            <span class="db-meta-chip">💻 ${meetType}</span>
                        </div>
                        <div id="meeting-detail-${next.id}" style="margin-top:4px;">${meetingActionHtml}</div>
                    </div>
                    <div class="db-ncc-actions">
                        ${countdownStr ? `<span class="db-countdown-badge">${countdownStr.replace('·','').trim()}</span>` : ''}
                        <button class="db-ncc-btn-secondary" onclick="startMessage('${partnerId}')">Message</button>
                    </div>
                </div>`;
        }

        function renderDbMatches() {
            const container = document.getElementById('dbMatchesList');
            if (!container) return;

            // Get IDs of already-connected / pending users
            const connectedIds = new Set();
            connections.forEach(c => {
                connectedIds.add(c.user_id);
                connectedIds.add(c.connected_user_id);
            });
            sentRequests.forEach(r => connectedIds.add(r.connected_user_id));

            const suggestions = users
                .filter(u => u.id !== currentUser.id && !connectedIds.has(u.id))
                .slice(0, 3);

            if (suggestions.length === 0) {
                container.innerHTML = `<div style="grid-column:1/-1;padding:32px;text-align:center;font-size:13px;color:var(--muted);">You've connected with everyone so far!<br><button class="db-ncc-btn-primary" onclick="switchView('discoverView')" style="margin-top:12px;">Find More People</button></div>`;
                return;
            }

            const avatarColors = ['#6b3f2a','#2d6a4f','#1e4d8c','#7e3ff2','#be185d'];

            container.innerHTML = suggestions.map((u, i) => {
                const fn       = u.firstName || '?';
                const ln       = u.lastName  || '?';
                const initials = (fn[0] || '') + (ln[0] || '');
                const bgColor  = avatarColors[i % avatarColors.length];
                const roleLine = [u.role, u.company].filter(Boolean).join(' · ') || u.industry || 'Rowan University';
                const sharedInterests = (u.interests||[]).filter(interest => (currentUser.interests||[]).includes(interest)).length;
                const pct = Math.min(99, 60 + sharedInterests * 10 + (u.industry === currentUser.industry ? 12 : 0));

                return `
                    <div class="db-person-card" onclick="viewProfile('${u.id}')">
                        <span class="db-person-pct-badge">${pct}% match</span>
                        <div class="db-person-card-av" style="background:${bgColor}">${initials}</div>
                        <div class="db-person-card-name">${fn} ${ln}</div>
                        <div class="db-person-card-role">${roleLine}</div>
                        <button class="db-person-card-btn" onclick="event.stopPropagation();connectUser('${u.id}')">Connect</button>
                    </div>`;
            }).join('');
        }

        function renderDbActivity() {
            const container = document.getElementById('dbActivityFeed');
            if (!container) return;

            const items = [];

            // Upcoming meetings
            meetings
                .filter(m => m.status !== 'completed')
                .sort((a,b) => new Date(a.start_time||a.date) - new Date(b.start_time||b.date))
                .slice(0,2)
                .forEach(m => {
                    const isOrg = m.organizer_id === currentUser.id;
                    const pid   = isOrg ? m.participant_id : m.organizer_id;
                    const p     = users.find(u => u.id === pid);
                    const name  = p ? `${p.firstName} ${p.lastName}` : 'Someone';
                    const dtRaw = m.start_time || m.date;
                    const dateStr = dtRaw ? new Date(dtRaw).toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'}) : 'soon';
                    items.push({ icon: '☕', cls: 'orange', main: `<strong>${name}</strong> – coffee chat confirmed for ${dateStr}.`, time: 'Upcoming', unread: true });
                });

            // Recent connections
            connections.slice(0, 2).forEach(c => {
                const pid = c.user_id === currentUser.id ? c.connected_user_id : c.user_id;
                const p   = users.find(u => u.id === pid);
                const name = p ? `${p.firstName} ${p.lastName}` : 'Someone';
                items.push({ icon: '🤝', cls: 'green', main: `<strong>${name}</strong> is now in your network.`, time: 'Recent', unread: false });
            });

            // Groups
            const joinedGroups = groups.filter(g => myGroupIds.has(g.id)).slice(0, 1);
            joinedGroups.forEach(g => {
                items.push({ icon: '👥', cls: 'blue', main: `You joined <strong>${g.name}</strong>.`, time: 'Recent', unread: false });
            });

            // Completed chats
            meetings.filter(m => m.status === 'completed').slice(0,1).forEach(m => {
                const pid = m.organizer_id === currentUser.id ? m.participant_id : m.organizer_id;
                const p   = users.find(u => u.id === pid);
                const name = p ? `${p.firstName} ${p.lastName}` : 'Someone';
                items.push({ icon: '⭐', cls: 'cream', main: `Coffee chat with <strong>${name}</strong> completed! ☕`, time: 'Past', unread: false });
            });

            if (items.length === 0) {
                container.innerHTML = `<div class="db-activity-item"><div style="padding:12px 0;font-size:13px;color:var(--muted);">No activity yet. Start by discovering people or joining a group!</div></div>`;
                return;
            }

            container.innerHTML = items.slice(0, 4).map((it, i) => `
                <div class="db-activity-item">
                    <div class="db-act-icon ${it.cls}">${it.icon}</div>
                    <div style="flex:1;">
                        <div class="db-act-main">${it.main}</div>
                        <div class="db-act-time">${it.time}</div>
                    </div>
                    ${it.unread ? '<div class="db-act-dot"></div>' : ''}
                </div>`).join('');
        }

        function renderDbGroups() {
            const container = document.getElementById('dbGroupsList');
            if (!container) return;

            const joinedGroups = groups.filter(g => myGroupIds.has(g.id));

            if (joinedGroups.length === 0) {
                const allGroups = groups.slice(0, 3);
                if (allGroups.length === 0) {
                    container.innerHTML = `<div style="padding:16px 18px;font-size:13px;color:var(--muted);">No groups yet. <button style="background:none;border:none;color:var(--caramel);font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:13px;" onclick="switchView('groupsView')">Browse communities →</button></div>`;
                    return;
                }
                // Show suggestable groups
                container.innerHTML = allGroups.map((g, i) => {
                    const isLast = i === allGroups.length - 1;
                    return `
                        <div class="db-group-item" onclick="switchView('groupsView')" style="${!isLast?'':''}">
                            <div class="db-group-icon">👥</div>
                            <div>
                                <div class="db-group-name">${g.name}</div>
                                <div class="db-group-meta">${g.member_count||0} members</div>
                            </div>
                            <span class="db-group-badge">+ Join</span>
                        </div>`;
                }).join('');
                return;
            }

            container.innerHTML = joinedGroups.slice(0, 3).map((g, i) => {
                const isLast = i === Math.min(joinedGroups.length, 3) - 1;
                const icon = g.icon || '👥';
                return `
                    <div class="db-group-item" onclick="viewGroup('${g.id}')" style="${!isLast ? 'border-bottom:1px solid var(--border)' : ''}">
                        <div class="db-group-icon">${icon}</div>
                        <div>
                            <div class="db-group-name">${g.name}</div>
                            <div class="db-group-meta">${g.member_count||0} members</div>
                        </div>
                        <span class="db-group-badge new">Active</span>
                    </div>`;
            }).join('');
        }

        // ===== HUB TABS =====
        let activeHubTab = 'network';

        function switchHubTab(tab) {
            activeHubTab = tab;
            ['network', 'groups', 'chats'].forEach(t => {
                const btn = document.getElementById(`tab${t.charAt(0).toUpperCase() + t.slice(1)}`);
                const panel = document.getElementById(`hub${t.charAt(0).toUpperCase() + t.slice(1)}Panel`);
                if (btn) btn.classList.toggle('active', t === tab);
                if (panel) panel.classList.toggle('active', t === tab);
            });
            renderActiveHubTab();
        }

        function renderActiveHubTab() {
            if (activeHubTab === 'network') renderHubNetworkFeed();
            if (activeHubTab === 'groups') renderHubGroupsFeed();
            if (activeHubTab === 'chats') renderHubChats();
        }

        function renderHubNetworkFeed() {
            const container = document.getElementById('hubNetworkFeed');
            if (!container) return;

            // Pending incoming requests section
            const pendingHTML = pendingRequests.length > 0 ? `
                <div style="background: #FFF8F0; border: 1px solid var(--accent); border-radius: 12px; padding: 1rem; margin-bottom: 1.25rem;">
                    <p style="font-weight: 700; font-size: 14px; color: var(--primary); margin-bottom: 0.75rem;">
                        🤝 ${pendingRequests.length} Connection Request${pendingRequests.length > 1 ? 's' : ''}
                    </p>
                    ${pendingRequests.map(req => {
                        const senderId = req.sender_id || req.user_id;
                        const requester = users.find(u => u.id === senderId);
                        if (!requester) return '';
                        const fn = requester.firstName || '?';
                        const ln = requester.lastName || '?';
                        return `
                            <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.75rem;">
                                <div class="person-avatar" style="width: 40px; height: 40px; font-size: 15px; flex-shrink: 0; cursor:pointer;" onclick="viewProfile('${requester.id}')">${fn[0]}${ln[0]}</div>
                                <div style="flex: 1; min-width: 0;">
                                    <strong style="font-size: 13px;">${fn} ${ln}</strong>
                                    <p style="font-size: 11px; color: #888; margin: 0;">${requester.role || requester.industry || ''}</p>
                                    ${req.note ? `<p style="font-size: 11px; color: #666; margin: 2px 0 0; font-style: italic;">"${req.note}"</p>` : ''}
                                </div>
                                <div style="display: flex; gap: 0.4rem; flex-shrink: 0;">
                                    <button class="btn btn-primary btn-sm" onclick="acceptConnection('${req.id}')" style="font-size: 11px; padding: 4px 10px;">Accept</button>
                                    <button class="btn btn-secondary btn-sm" onclick="rejectConnection('${req.id}')" style="font-size: 11px; padding: 4px 10px;">Decline</button>
                                </div>
                            </div>`;
                    }).join('')}
                </div>` : '';

            const chatInviteHTML = chatInvites.length > 0 ? `
                <div style="background: #F0F8FF; border: 1px solid #A8D0E8; border-radius: 12px; padding: 1rem; margin-bottom: 1.25rem;">
                    <p style="font-weight: 700; font-size: 14px; color: #3A7CA5; margin-bottom: 0.75rem;">
                        ☕ ${chatInvites.length} Coffee Chat Request${chatInvites.length > 1 ? 's' : ''}
                    </p>
                    ${chatInvites.map(invite => {
                        const requester = users.find(u => u.id === invite.sender_id);
                        if (!requester) return '';
                        const fn = requester.firstName || '?';
                        const ln = requester.lastName || '?';
                        return `
                            <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.75rem;">
                                <div class="person-avatar" style="width: 40px; height: 40px; font-size: 15px; flex-shrink: 0; cursor:pointer;" onclick="viewProfile('${requester.id}')">${fn[0]}${ln[0]}</div>
                                <div style="flex: 1; min-width: 0;">
                                    <strong style="font-size: 13px;">${fn} ${ln}</strong>
                                    ${invite.topic ? `<p style="font-size: 11px; color: #555; margin: 2px 0 0;">Topic: ${invite.topic}</p>` : ''}
                                    ${invite.note ? `<p style="font-size: 11px; color: #888; margin: 2px 0 0; font-style: italic;">"${invite.note}"</p>` : ''}
                                </div>
                                <div style="display: flex; gap: 0.4rem; flex-shrink: 0;">
                                    <button class="btn btn-primary btn-sm" onclick="acceptChatInvite('${invite.id}')" style="font-size: 11px; padding: 4px 10px;">Accept</button>
                                    <button class="btn btn-secondary btn-sm" onclick="declineChatInvite('${invite.id}')" style="font-size: 11px; padding: 4px 10px;">Decline</button>
                                </div>
                            </div>`;
                    }).join('')}
                </div>` : '';

            const connectedIds = new Set();
            connections.forEach(c => {
                if (c.user_id === currentUser.id) connectedIds.add(c.connected_user_id);
                if (c.connected_user_id === currentUser.id) connectedIds.add(c.user_id);
            });

            const connectedUsers = users.filter(u => connectedIds.has(u.id));
            const count = connectedUsers.length;

            // Sent requests section
            const sentHTML = sentRequests.length > 0 ? `
                <div style="background: #F9F5FF; border: 1px solid #D8B4FE; border-radius: 12px; padding: 1rem; margin-bottom: 1.25rem;">
                    <p style="font-weight: 700; font-size: 14px; color: #7C3AED; margin-bottom: 0.75rem;">
                        📤 ${sentRequests.length} Pending Request${sentRequests.length > 1 ? 's' : ''} Sent
                    </p>
                    ${sentRequests.map(req => {
                        const u = users.find(x => x.id === req.connected_user_id);
                        if (!u) return '';
                        const fn = u.firstName || '?';
                        const ln = u.lastName || '?';
                        return `
                            <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.75rem;">
                                <div class="person-avatar" style="width: 40px; height: 40px; font-size: 15px; flex-shrink: 0; cursor:pointer;" onclick="viewProfile('${u.id}')">${fn[0]}${ln[0]}</div>
                                <div style="flex: 1; min-width: 0;">
                                    <strong style="font-size: 13px;">${fn} ${ln}</strong>
                                    <p style="font-size: 11px; color: #888; margin: 0;">Awaiting response…</p>
                                </div>
                                <button class="btn btn-secondary btn-sm" onclick="cancelNwRequest('${req.id}')" style="font-size: 11px; padding: 4px 10px; flex-shrink:0;">Cancel</button>
                            </div>`;
                    }).join('')}
                </div>` : '';

            if (count === 0 && pendingRequests.length === 0 && chatInvites.length === 0 && sentRequests.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">🤝</div>
                        <p>You haven't connected with anyone yet.</p>
                        <button class="btn btn-primary" onclick="switchView('discoverView')" style="margin-top:1rem;">Find Your People</button>
                    </div>`;
                return;
            }

            container.innerHTML = pendingHTML + chatInviteHTML + sentHTML + (count > 0 ? `
                <p style="font-weight:600;font-size:15px;color:var(--text-dark);margin-bottom:1rem;">
                    ${count} connection${count !== 1 ? 's' : ''}
                </p>
                ${connectedUsers.map(u => {
                    const fn = u.firstName || '?';
                    const ln = u.lastName || '?';
                    const initials = `${fn[0]}${ln[0]}`;
                    const roleLine = [u.role, u.industry].filter(Boolean).join(' · ');
                    return `
                        <div class="connection-card">
                            <div class="connection-card-avatar" onclick="viewProfile('${u.id}')" style="cursor:pointer;" title="View profile">${initials}</div>
                            <div class="connection-card-info">
                                <div class="connection-card-name" onclick="viewProfile('${u.id}')" style="cursor:pointer;">${fn} ${ln}</div>
                                ${roleLine ? `<div class="connection-card-role">${roleLine}</div>` : ''}
                            </div>
                            <div class="connection-card-actions">
                                <button class="btn btn-secondary btn-sm" onclick="openChatWith('${u.id}')">💬 Message</button>
                                <button class="btn btn-accent btn-sm" onclick="openScheduleForUser('${u.id}')">☕ Schedule Chat</button>
                            </div>
                        </div>`;
                }).join('')}
                <div class="find-more-banner" onclick="switchView('discoverView')">
                    <div>
                        <div style="font-weight:700;font-size:14px;color:var(--primary);">Looking to expand your network?</div>
                        <div style="font-size:13px;color:#888;margin-top:3px;">Discover Rowan students who share your interests ✨</div>
                    </div>
                    <button class="btn btn-primary btn-sm" style="pointer-events:none;">Find Students →</button>
                </div>` : '');
        }

        function renderHubGroupsFeed() {
            const container = document.getElementById('hubGroupsFeed');
            if (!container) return;

            const joinedGroups = groups.filter(g => myGroupIds.has(g.id));
            const count = joinedGroups.length;

            if (count === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">👥</div>
                        <p>You haven't joined any groups yet.</p>
                        <button class="btn btn-primary" onclick="switchView('groupsView')" style="margin-top:1rem;">Browse Communities</button>
                    </div>`;
                return;
            }

            container.innerHTML = `
                <p style="font-weight:600;font-size:15px;color:var(--text-dark);margin-bottom:1rem;">
                    ${count} group${count !== 1 ? 's' : ''}
                </p>
                ${joinedGroups.map(g => `
                    <div class="group-list-card">
                        <div class="group-list-icon">👥</div>
                        <div style="flex:1;min-width:0;">
                            <div style="font-weight:600;font-size:14px;color:var(--text-dark);">${g.name}</div>
                            <div style="font-size:12px;color:#888;margin-top:2px;">${g.member_count || 0} members${g.description ? ' · ' + g.description.substring(0, 60) + '…' : ''}</div>
                        </div>
                        <button class="btn btn-secondary btn-sm" onclick="viewGroup('${g.id}')">View Group</button>
                    </div>`).join('')}
                <div class="find-more-banner" onclick="switchView('groupsView')">
                    <div>
                        <div style="font-weight:700;font-size:14px;color:var(--primary);">Find more communities to join!</div>
                        <div style="font-size:13px;color:#888;margin-top:3px;">There are groups for every major, interest, and goal 🎓</div>
                    </div>
                    <button class="btn btn-primary btn-sm" style="pointer-events:none;">Browse Groups →</button>
                </div>`;
        }

        async function renderHubChats() {
            const container = document.getElementById('hubChatsContent');
            if (!container) return;

            // Build connections list for search
            const connectedIds = new Set();
            connections.forEach(c => {
                if (c.user_id === currentUser.id) connectedIds.add(c.connected_user_id);
                if (c.connected_user_id === currentUser.id) connectedIds.add(c.user_id);
            });

            // Get upcoming scheduled meetings
            const upcomingMeetings = meetings
                .filter(m => m.status !== 'completed' && new Date(m.start_time || m.date) >= new Date())
                .sort((a, b) => new Date(a.start_time || a.date) - new Date(b.start_time || b.date))
                .slice(0, 5);

            const meetingsHTML = upcomingMeetings.length > 0
                ? upcomingMeetings.map(m => {
                    const partnerUser = users.find(u => u.id === m.organizer_id || u.id === m.participant_id);
                    const partnerName = partnerUser ? `${partnerUser.firstName} ${partnerUser.lastName}` : (m.participant_name || m.organizer_name || 'Someone');
                    const dateStr = m.start_time ? new Date(m.start_time).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : (m.date || 'TBD');
                    return `
                        <div class="scheduled-chat-item">
                            <div class="scheduled-chat-icon">☕</div>
                            <div style="flex:1;min-width:0;">
                                <div style="font-weight:600;font-size:14px;color:var(--text-dark);">${partnerName}</div>
                                <div style="font-size:12px;color:#888;">${dateStr}${m.duration ? ` · ${m.duration} min` : ''}</div>
                            </div>
                        </div>`;
                }).join('')
                : `<div style="color:#888;font-size:13px;padding:1rem 0;">No upcoming chats scheduled.</div>`;

            // Get conversation list from connected mock users (and real messages via supabase)
            const connectedUsers = users.filter(u => connectedIds.has(u.id));

            let conversationsHTML = '';
            if (connectedUsers.length > 0) {
                conversationsHTML = connectedUsers.map(u => {
                    const initials = `${u.firstName[0]}${u.lastName[0]}`;
                    return `
                        <div class="chat-inbox-item" onclick="openChatWith('${u.id}')">
                            <div class="chat-inbox-avatar">${initials}</div>
                            <div class="chat-inbox-info">
                                <div class="chat-inbox-name">${u.firstName} ${u.lastName}</div>
                                <div class="chat-inbox-preview">Say hello! ☕</div>
                            </div>
                        </div>`;
                }).join('');
            } else {
                // Try to load real conversations from Supabase via inbox view
                try {
                    const { data: inboxData } = await supabaseClient
                        .from('inbox')
                        .select('*, other_profile:profiles!inner(first_name, last_name, profile_picture)');

                    if (inboxData && inboxData.length > 0) {
                        conversationsHTML = inboxData.map(conv => {
                            const p = conv.other_profile;
                            const preview = (conv.last_message || 'Start a conversation').substring(0, 45);
                            const fn = p?.first_name?.[0] || '?';
                            const ln = p?.last_name?.[0] || '?';
                            return `
                                <div class="chat-inbox-item" onclick="openChatWith('${conv.other_user_id}')">
                                    <div class="chat-inbox-avatar">${fn}${ln}</div>
                                    <div class="chat-inbox-info">
                                        <div class="chat-inbox-name">${p ? `${p.first_name} ${p.last_name}` : 'User'}</div>
                                        <div class="chat-inbox-preview">${preview}${preview.length >= 45 ? '…' : ''}</div>
                                    </div>
                                </div>`;
                        }).join('');
                    }
                } catch (e) { /* silent */ }
            }

            if (!conversationsHTML) {
                conversationsHTML = `<div style="color:#888;font-size:13px;padding:1rem 0;">No conversations yet. Connect with someone and start chatting!</div>`;
            }

            container.innerHTML = `
                <div style="background:white;border-radius:12px;padding:1.5rem;border:1px solid var(--border);">
                    <div class="chats-hub-header">
                        <div class="chats-hub-search">
                            <input type="text" id="chatsSearchInput" placeholder="Search your connections…" oninput="filterChatsSearch(this.value)">
                        </div>
                        <button class="btn-schedule-chat" onclick="openScheduleModal()">
                            ☕ Schedule a Chat
                        </button>
                    </div>

                    <div class="chats-section-label">Upcoming Chats</div>
                    <div id="upcomingChatsList">${meetingsHTML}</div>

                    <div class="chats-section-label">Messages</div>
                    <div id="chatsInboxList">${conversationsHTML}</div>
                </div>`;
        }

        function filterChatsSearch(query) {
            const q = query.toLowerCase().trim();
            const items = document.querySelectorAll('#chatsInboxList .chat-inbox-item');
            items.forEach(item => {
                const name = item.querySelector('.chat-inbox-name')?.textContent.toLowerCase() || '';
                item.style.display = !q || name.includes(q) ? '' : 'none';
            });
        }

        function openChatWith(userId) {
            switchView('inboxView');
            selectInboxConv(userId);
        }

        // ===== SCHEDULE CHAT MODAL =====
        let scheduleModalUserId = null;
        let selectedModalTime = null;

        // Mock availability for demo users
        const mockUserAvailability = {
            '00000000-0000-0000-0000-000000000002': [
                { day: 1, start: '10:00', end: '12:00' },
                { day: 3, start: '14:00', end: '17:00' },
                { day: 5, start: '09:00', end: '11:00' }
            ],
            '00000000-0000-0000-0000-000000000003': [
                { day: 2, start: '11:00', end: '13:00' },
                { day: 4, start: '15:00', end: '18:00' }
            ],
            '00000000-0000-0000-0000-000000000004': [
                { day: 1, start: '09:00', end: '11:00' },
                { day: 2, start: '14:00', end: '16:00' },
                { day: 5, start: '13:00', end: '15:00' }
            ],
            '00000000-0000-0000-0000-000000000005': [
                { day: 3, start: '10:00', end: '12:00' },
                { day: 4, start: '13:00', end: '15:00' }
            ],
            '00000000-0000-0000-0000-000000000006': [
                { day: 1, start: '14:00', end: '16:00' },
                { day: 5, start: '10:00', end: '12:00' }
            ]
        };
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        function openScheduleModal() {
            const connectedIds = new Set();
            connections.forEach(c => {
                if (c.user_id === currentUser.id) connectedIds.add(c.connected_user_id);
                if (c.connected_user_id === currentUser.id) connectedIds.add(c.user_id);
            });
            const connectedUsers = users.filter(u => connectedIds.has(u.id));

            if (connectedUsers.length === 0) {
                alert("Connect with someone first before scheduling a chat!");
                closeModal('scheduleChatModal');
                switchView('discoverView');
                return;
            }

            const list = document.getElementById('schedulePersonList');
            list.innerHTML = connectedUsers.map(u => `
                <div class="schedule-modal-person" onclick="selectSchedulePerson('${u.id}')">
                    <div class="chat-inbox-avatar" style="font-size:15px;">${u.firstName[0]}${u.lastName[0]}</div>
                    <div style="flex:1;">
                        <div style="font-weight:600;font-size:14px;">${u.firstName} ${u.lastName}</div>
                        <div style="font-size:12px;color:#888;">${[u.role, u.industry].filter(Boolean).join(' · ')}</div>
                    </div>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ccc" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                </div>`).join('');

            document.getElementById('scheduleStep1').style.display = 'block';
            document.getElementById('scheduleStep2').style.display = 'none';
            selectedModalTime = null;
            openModal('scheduleChatModal');
        }

        function openScheduleForUser(userId) {
            const user = users.find(u => u.id === userId);
            if (!user) return;
            // Show modal directly at step 2
            document.getElementById('scheduleStep1').style.display = 'none';
            document.getElementById('scheduleStep2').style.display = 'block';
            selectedModalTime = null;
            openModal('scheduleChatModal');
            _populateScheduleStep2(user);
        }

        function selectSchedulePerson(userId) {
            const user = users.find(u => u.id === userId);
            if (!user) return;
            document.getElementById('scheduleStep1').style.display = 'none';
            document.getElementById('scheduleStep2').style.display = 'block';
            selectedModalTime = null;
            _populateScheduleStep2(user);
        }

        function _populateScheduleStep2(user) {
            scheduleModalUserId = user.id;
            selectedPerson = user;

            document.getElementById('schedulePickedAvatar').textContent = `${user.firstName[0]}${user.lastName[0]}`;
            document.getElementById('schedulePickedName').textContent = `${user.firstName} ${user.lastName}`;
            document.getElementById('modalScheduleTopic').value = '';

            // Show availability
            const avail = mockUserAvailability[user.id] || [];
            const availContainer = document.getElementById('schedulePickedAvailability');
            if (avail.length > 0) {
                availContainer.innerHTML = `
                    <div style="background:var(--accent-light);border-radius:10px;padding:0.875rem 1rem;border:1px solid var(--border);">
                        <div style="font-weight:600;font-size:13px;color:var(--primary);margin-bottom:0.5rem;">
                            ☕ ${user.firstName}'s typical availability
                        </div>
                        <div style="display:flex;flex-wrap:wrap;gap:0.5rem;">
                            ${avail.map(a => `
                                <span style="background:white;border:1px solid var(--border);border-radius:8px;padding:4px 10px;font-size:12px;font-weight:600;color:var(--text-dark);">
                                    ${dayNames[a.day]} ${a.start}–${a.end}
                                </span>`).join('')}
                        </div>
                        <p style="font-size:11px;color:#aaa;margin-top:0.5rem;">Pick a date and time that works for both of you — they'll confirm the request.</p>
                    </div>`;
            } else {
                availContainer.innerHTML = `
                    <div style="font-size:13px;color:#888;padding:0.5rem 0;">
                        No set availability yet — feel free to request any time that works for you!
                    </div>`;
            }

            // Set default date to tomorrow
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            document.getElementById('modalScheduleDate').value = tomorrow.toISOString().split('T')[0];
            renderModalTimeSlots();
        }

        function resetScheduleStep() {
            document.getElementById('scheduleStep1').style.display = 'block';
            document.getElementById('scheduleStep2').style.display = 'none';
            scheduleModalUserId = null;
            selectedModalTime = null;
        }

        function renderModalTimeSlots() {
            const times = [];
            for (let hour = 8; hour < 20; hour++) {
                for (let min of [0, 30]) {
                    times.push(`${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`);
                }
            }
            selectedModalTime = null;
            document.getElementById('modalTimeSlots').innerHTML = times.map(t =>
                `<div class="time-slot" onclick="selectModalTime('${t}', this)">${t}</div>`
            ).join('');
        }

        function selectModalTime(time, el) {
            document.querySelectorAll('#modalTimeSlots .time-slot').forEach(e => e.classList.remove('selected'));
            el.classList.add('selected');
            selectedModalTime = time;
        }

        function updateScheduleDetailField(val) {
            const linkField     = document.getElementById('scheduleDetailLink');
            const phoneField    = document.getElementById('scheduleDetailPhone');
            const locationField = document.getElementById('scheduleDetailLocation');
            if (!linkField) return;
            linkField.style.display     = ['video','zoom','facetime'].includes(val) ? 'block' : 'none';
            phoneField.style.display    = val === 'phone'    ? 'block' : 'none';
            locationField.style.display = val === 'inperson' ? 'block' : 'none';
        }

        async function sendModalMeetingRequest() {
            const date = document.getElementById('modalScheduleDate').value;
            const duration = document.getElementById('modalScheduleDuration').value;
            const topic = document.getElementById('modalScheduleTopic').value.trim();
            const type = document.getElementById('modalScheduleType').value;

            if (!date) { alert('Please select a date'); return; }
            if (!selectedModalTime) { alert('Please select a time slot'); return; }
            if (!topic) { alert('Please add a note about what you\'d like to discuss'); return; }
            if (!selectedPerson) { alert('Please select a person to chat with'); return; }

            // Collect contact detail based on meeting type
            let meeting_url = null, meetingLocation = null;
            if (['video','zoom','facetime'].includes(type)) {
                meeting_url = document.getElementById('meetingLinkInput')?.value.trim() || null;
            } else if (type === 'phone') {
                meetingLocation = document.getElementById('meetingPhoneInput')?.value.trim() || null;
            } else if (type === 'inperson') {
                meetingLocation = document.getElementById('meetingLocationInput')?.value.trim() || null;
            }

            const startTime = new Date(`${date}T${selectedModalTime}:00`);
            const endTime = new Date(startTime.getTime() + parseInt(duration) * 60000);

            try {
                const { data, error } = await supabaseClient
                    .from('meetings')
                    .insert([{
                        organizer_id: currentUser.id,
                        participant_id: selectedPerson.id,
                        title: `Coffee Chat with ${selectedPerson.firstName} ${selectedPerson.lastName}`,
                        description: topic,
                        note: topic,
                        meeting_type: type,
                        meeting_url: meeting_url,
                        location: meetingLocation,
                        start_time: startTime.toISOString(),
                        end_time: endTime.toISOString(),
                        status: 'pending'
                    }])
                    .select()
                    .single();

                if (error) throw error;

                meetings.push(data);
                closeModal('scheduleChatModal');
                selectedModalTime = null;
                // Reset detail fields
                document.getElementById('meetingLinkInput').value = '';
                document.getElementById('meetingPhoneInput').value = '';
                document.getElementById('meetingLocationInput').value = '';
                showToast(`Chat request sent to ${selectedPerson.firstName}! ☕`, 'success');
                updateDashboard();
            } catch (err) {
                console.error('Error sending meeting request:', err);
                alert('Failed to send chat request: ' + err.message);
            }
        }

        function renderMeetingAction(m, isOrganizer) {
            const type = m.meeting_type;
            const url  = m.meeting_url;
            const loc  = m.location;
            const esc  = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

            if (['video','zoom','facetime'].includes(type) && url) {
                const label = type === 'zoom' ? 'Zoom' : type === 'facetime' ? 'FaceTime' : 'Video';
                return `<div class="meeting-detail-row">
                    <span class="meeting-detail-icon">🔗</span>
                    <a href="${esc(url)}" target="_blank" rel="noopener" class="meeting-link-btn">Join ${label} Call →</a>
                </div>`;
            }
            if (type === 'phone' && loc) {
                return `<div class="meeting-detail-row">
                    <span class="meeting-detail-icon">📞</span>
                    <a href="tel:${esc(loc)}" class="meeting-link-btn">Call ${esc(loc)}</a>
                </div>`;
            }
            if ((type === 'inperson' || type === 'coffee') && loc) {
                const mapsUrl = 'https://maps.google.com/?q=' + encodeURIComponent(loc);
                return `<div class="meeting-detail-row">
                    <span class="meeting-detail-icon">📍</span>
                    <a href="${mapsUrl}" target="_blank" rel="noopener" class="meeting-link-btn">${esc(loc)}</a>
                </div>`;
            }
            // Fallback
            if (isOrganizer) {
                return `<div class="meeting-detail-row" style="cursor:pointer;font-style:normal;" onclick="addMeetingDetail('${m.id}','${type||'video'}')">
                    <span class="meeting-detail-icon">➕</span>
                    <span class="meeting-link-btn">Add meeting link / location</span>
                </div>`;
            }
            return `<div class="meeting-detail-row no-details">
                <span class="meeting-detail-icon">⏳</span>
                <span>Meeting details not added yet</span>
            </div>`;
        }

        function addMeetingDetail(meetingId, type) {
            const rowEl = document.getElementById(`meeting-detail-${meetingId}`);
            if (!rowEl) return;
            const isLink = ['video','zoom','facetime'].includes(type);
            const placeholder = isLink ? 'Paste meeting link…' : type === 'phone' ? 'Enter phone number…' : 'Enter location / address…';
            rowEl.innerHTML = `<div style="display:flex;gap:6px;align-items:center;width:100%;padding:4px 0;">
                <input type="text" id="meeting-detail-input-${meetingId}"
                    placeholder="${placeholder}"
                    style="flex:1;padding:7px 10px;border:1.5px solid var(--border);border-radius:8px;font-size:13px;font-family:'DM Sans',sans-serif;outline:none;color:var(--espresso);"
                    onkeydown="if(event.key==='Enter')saveMeetingDetail('${meetingId}','${type}')">
                <button onclick="saveMeetingDetail('${meetingId}','${type}')"
                    style="padding:7px 12px;background:var(--espresso);color:var(--cream);border:none;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;white-space:nowrap;">Save</button>
            </div>`;
            document.getElementById(`meeting-detail-input-${meetingId}`)?.focus();
        }

        async function saveMeetingDetail(meetingId, type) {
            const val = document.getElementById(`meeting-detail-input-${meetingId}`)?.value.trim();
            if (!val) return;
            const isLink = ['video','zoom','facetime'].includes(type);
            const updateData = isLink ? { meeting_url: val, location: null } : { location: val, meeting_url: null };
            try {
                const { error } = await supabaseClient.from('meetings').update(updateData).eq('id', meetingId);
                if (error) throw error;
                const mtg = meetings.find(m => m.id === meetingId);
                if (mtg) Object.assign(mtg, updateData);
                showToast('Meeting details saved! ☕', 'success');
                renderMeetingCards();
            } catch(err) {
                console.error('saveMeetingDetail:', err);
                showToast('Failed to save details', 'error');
            }
        }

        function formatTimeAgo(date) {
            const diff = Date.now() - date.getTime();
            const hours = Math.floor(diff / 3600000);
            if (hours < 1) return 'Just now';
            if (hours < 24) return `${hours}h ago`;
            const days = Math.floor(hours / 24);
            if (days === 1) return 'Yesterday';
            return `${days}d ago`;
        }

        // Discovery
        function renderDiscovery() {
            // Render smart recommendations (isolated — never blocks main grid)
            const searchName = document.getElementById('searchName')?.value.toLowerCase() || '';
            const filterIndustry = document.getElementById('filterIndustry')?.value || '';
            const searchLocation = document.getElementById('searchLocation')?.value.toLowerCase() || '';
            const searchInterests = document.getElementById('searchInterests')?.value.toLowerCase() || '';
            const searchCompany = document.getElementById('searchCompany')?.value.toLowerCase() || '';

            const filtersActive = searchName || filterIndustry || searchLocation || searchInterests || searchCompany;

            // Render recommendations (only when no filters active)
            const recSection = document.getElementById('recommendationsSection');
            if (recSection) {
                try {
                    recSection.innerHTML = filtersActive ? '' : renderRecommendations();
                } catch (e) {
                    console.warn('Recommendations render error:', e);
                    recSection.innerHTML = '';
                }
            }

            // Collect recommended user IDs so we don't show them again in the main grid
            let recommendedIds = new Set();
            if (!filtersActive) {
                try {
                    getSmartRecommendations().slice(0, 3).forEach(item => recommendedIds.add(item.user.id));
                } catch (e) { /* ignore */ }
            }

            // Build set of IDs to hide: self, connected, sent-pending, recommendations
            const connectedOrPendingIds = new Set();
            connections.forEach(c => {
                connectedOrPendingIds.add(c.user_id);
                connectedOrPendingIds.add(c.connected_user_id);
            });
            sentRequests.forEach(r => connectedOrPendingIds.add(r.connected_user_id));

            let filtered = users.filter(u => {
                // Never show self
                if (u.id === currentUser.id) return false;

                // Hide already-connected or pending-sent users
                if (connectedOrPendingIds.has(u.id)) return false;

                // Hide users already shown in the recommendations section
                if (recommendedIds.has(u.id)) return false;

                // Name match
                const matchName = !searchName ||
                    (u.firstName || '').toLowerCase().includes(searchName) ||
                    (u.lastName || '').toLowerCase().includes(searchName);

                // Industry match
                const matchIndustry = !filterIndustry || u.industry === filterIndustry;

                // Location match
                const matchLocation = !searchLocation ||
                    (u.location && u.location.toLowerCase().includes(searchLocation));

                // Interests match
                const matchInterests = !searchInterests ||
                    (u.interests && u.interests.some(interest =>
                        interest.toLowerCase().includes(searchInterests)
                    )) ||
                    (u.hobbies && u.hobbies.some(hobby =>
                        hobby.toLowerCase().includes(searchInterests)
                    ));

                // Company match
                const matchCompany = !searchCompany ||
                    (u.company && u.company.toLowerCase().includes(searchCompany));

                return matchName && matchIndustry && matchLocation && matchInterests && matchCompany;
            });

            const grid = document.getElementById('discoverGrid');
            try {
            grid.innerHTML = filtered.map(user => {
                const fn = user.firstName || '?';
                const ln = user.lastName || '?';
                const isConnected = connections.find(c =>
                    (c.user_id === currentUser.id && c.connected_user_id === user.id) ||
                    (c.connected_user_id === currentUser.id && c.user_id === user.id));
                const isPending = sentRequests.find(c => c.connected_user_id === user.id);
                const hasRequestedMe = pendingRequests.find(c => (c.sender_id || c.user_id) === user.id);
                const avatarHTML = user.profilePicture ?
                    `<div class="person-avatar" style="width: 70px; height: 70px; font-size: 28px; margin: 0 auto 1rem;"><img src="${user.profilePicture}" alt="${fn}"></div>` :
                    `<div class="person-avatar" style="width: 70px; height: 70px; font-size: 28px; margin: 0 auto 1rem;">${fn[0]}${ln[0]}</div>`;

                let actionBtn;
                if (isConnected) {
                    actionBtn = `<button class="btn btn-secondary btn-sm" onclick="startMessage('${user.id}')" style="flex: 1; justify-content: center;">Message</button>`;
                } else if (hasRequestedMe) {
                    actionBtn = `<button class="btn btn-accent btn-sm" onclick="acceptConnection('${hasRequestedMe.id}')" style="flex: 1; justify-content: center;">Accept Request</button>`;
                } else if (isPending) {
                    actionBtn = `<button class="btn btn-secondary btn-sm" disabled style="flex: 1; justify-content: center; opacity: 0.6;">Request Sent</button>`;
                } else {
                    actionBtn = `<button class="btn btn-accent btn-sm" onclick="connectUser('${user.id}')" style="flex: 1; justify-content: center;">Connect</button>`;
                }

                return `
                    <div class="card person-card">
                        ${avatarHTML}
                        <h3>${fn} ${ln}</h3>
                        ${user.role ? `<p class="role">${user.role}</p>` : `<p class="role">${user.industry || ''}</p>`}
                        ${user.company ? `<p style="font-size: 12px; color: #999; margin-top: -0.25rem;">${user.company}</p>` : ''}
                        <div class="tags">
                            ${(user.interests || []).slice(0, 3).map(i => `<span class="tag">${i}</span>`).join('')}
                        </div>
                        <div class="profile-actions">
                            <button class="btn btn-primary btn-sm" onclick="viewProfile('${user.id}')" style="flex: 1; justify-content: center;">View Profile</button>
                            ${actionBtn}
                        </div>
                    </div>
                `;
            }).join('') || '<div class="empty-state"><p>No people found matching your filters.</p></div>';
            } catch (e) {
                console.error('Discover grid render error:', e);
                grid.innerHTML = '<div class="empty-state"><p>Could not load profiles. Please refresh.</p></div>';
            }
        }

        function filterDiscovery() {
            renderDiscovery();
        }

        function clearFilters() {
            document.getElementById('searchName').value = '';
            document.getElementById('filterIndustry').value = '';
            document.getElementById('searchLocation').value = '';
            document.getElementById('searchInterests').value = '';
            document.getElementById('searchCompany').value = '';
            renderDiscovery();
        }

        async function viewProfile(userId) {
            const user = users.find(u => u.id === userId);
            if (!user) return;

            selectedPerson = user;

            const isConnected = connections.find(c =>
                (c.user_id === currentUser.id && c.connected_user_id === userId) ||
                (c.connected_user_id === currentUser.id && c.user_id === userId)
            );
            const isOwnProfile = currentUser && currentUser.id === userId;

            const initials = `${user.firstName[0] || ''}${user.lastName[0] || ''}`.toUpperCase();
            const avatarHTML = user.profilePicture
                ? `<img src="${user.profilePicture}" alt="${user.firstName}">`
                : initials;

            // Build headline: prefer stored headline, fallback to role+company
            const headline = user.headline ||
                [user.role, user.company ? `@ ${user.company}` : ''].filter(Boolean).join(' ') ||
                user.industry || '';

            // Meta chips
            const chips = [
                user.gradYear ? `<span class="pv-chip">🎓 Class of ${user.gradYear}</span>` : '',
                user.major    ? `<span class="pv-chip caramel">📚 ${user.major}</span>` : '',
                user.industry ? `<span class="pv-chip caramel">💼 ${user.industry}</span>` : '',
                user.status   ? `<span class="pv-chip">${user.status}</span>` : '',
                `<span class="pv-chip open">✅ Open to chats</span>`
            ].filter(Boolean).join('');

            // Fetch achievements from dedicated table
            let _pvAchs = [];
            try {
                const { data: achData } = await supabaseClient
                    .from('achievements')
                    .select('*')
                    .eq('user_id', userId)
                    .order('display_order');
                _pvAchs = achData || [];
            } catch(e) { console.error('viewProfile achievements:', e); }

            // Fetch this user's posts from Supabase
            let _pvPosts = [];
            try {
                const { data: pvPostData } = await supabaseClient
                    .from('posts')
                    .select('*')
                    .eq('author_id', userId)
                    .is('group_id', null)
                    .order('created_at', { ascending: false });
                _pvPosts = pvPostData || [];
            } catch(e) { console.error('viewProfile posts:', e); }

            // Fetch like counts for this user's posts
            let _pvLikeMap = {};
            let _pvMyLikedSet = new Set();
            if (_pvPosts.length > 0) {
                try {
                    const pvPostIds = _pvPosts.map(p => p.id);
                    const { data: pvLikes } = await supabaseClient
                        .from('post_likes')
                        .select('post_id, user_id')
                        .in('post_id', pvPostIds);
                    (pvLikes || []).forEach(l => {
                        _pvLikeMap[l.post_id] = (_pvLikeMap[l.post_id] || 0) + 1;
                        if (l.user_id === currentUser.id) _pvMyLikedSet.add(l.post_id);
                    });
                } catch(e) {}
            }

            // Stats
            const achCount = _pvAchs.length;
            const intCount = (user.interests || []).length + (user.hobbies || []).length;
            const connCount = connections.filter(c =>
                c.user_id === userId || c.connected_user_id === userId
            ).length;

            // Achievements
            const achHTML = _pvAchs.length
                ? _pvAchs.map(a => {
                    const icon = ACH_TYPE_ICON[a.type] || '⭐';
                    const dateStr = _fmtAchDate(a.start_date, a.end_date, a.is_current);
                    return `
                    <div class="pv-ach-row">
                        <div class="pv-ach-icon">${icon}</div>
                        <div>
                            <div class="pv-ach-title">${_achEsc(a.title)}</div>
                            ${a.organization ? `<div class="pv-ach-org">${_achEsc(a.organization)}</div>` : ''}
                            ${dateStr ? `<div class="pv-ach-date">${dateStr}</div>` : ''}
                            ${a.description ? `<div class="pv-ach-desc">${_achEsc(a.description)}</div>` : ''}
                        </div>
                    </div>`;
                }).join('')
                : `<p style="font-size:13px;color:var(--muted);opacity:.7;">No achievements listed yet.</p>`;

            // Action card content based on connection state
            const actionCardHTML = !isOwnProfile ? `
                <div class="pv-action-card">
                    <div class="pv-action-label">☕ Connect</div>
                    <div class="pv-action-title">"Every great career starts with one good conversation."</div>
                    ${isConnected ? `
                        <button class="pv-action-btn" onclick="startMessage('${user.id}')">💬 Send Message</button>
                        <button class="pv-action-btn secondary" onclick="scheduleWith('${user.id}')">📅 Schedule a Chat</button>
                    ` : `
                        <button class="pv-action-btn" id="pvConnectBtn" onclick="pvHandleConnect(this,'${user.id}')">☕ Request a Sip</button>
                        <button class="pv-action-btn secondary" onclick="startMessage('${user.id}')">💬 Message first</button>
                    `}
                </div>` : `
                <div class="pv-card">
                    <div class="pv-card-eyebrow">Your Profile</div>
                    <div class="pv-card-title">Badges &amp; <em>Milestones</em></div>
                    <div class="badge-grid" id="profileBadges"></div>
                </div>`;

            const content = document.getElementById('profileDetailContent');
            const bannerStyle = user.bannerImage
                ? ` style="background-image:url('${user.bannerImage}')"` : '';
            const bannerClass = user.bannerImage ? ' has-image' : '';
            content.innerHTML = `
                <!-- Hero Banner -->
                <div class="pv-banner${bannerClass}"${bannerStyle}>
                    ${isOwnProfile ? `
                    <button class="pv-banner-edit-btn" onclick="document.getElementById('pvBannerFile').click()">
                        🖼 Edit Cover
                        <input type="file" id="pvBannerFile" accept="image/*" style="display:none;" onchange="uploadPvBanner(this)">
                    </button>` : ''}
                </div>

                <div class="pv-hero-inner">
                    <!-- Avatar + top actions -->
                    <div class="pv-avatar-row">
                        <div class="pv-avatar-wrap">
                            <div class="pv-avatar">${avatarHTML}</div>
                        </div>
                        ${!isOwnProfile ? `
                        <div class="pv-hero-actions">
                            ${isConnected
                                ? `<button class="pv-cta-secondary connected" onclick="startMessage('${user.id}')">💬 Message</button>`
                                : `<button class="pv-cta-secondary" onclick="startMessage('${user.id}')">💬 Message</button>`
                            }
                            ${isConnected
                                ? `<button class="pv-cta-primary" onclick="scheduleWith('${user.id}')">📅 Schedule Chat</button>`
                                : `<button class="pv-cta-primary" id="pvConnectBtnTop" onclick="pvHandleConnect(this,'${user.id}')">☕ Request a Sip</button>`
                            }
                        </div>` : `
                        <div class="pv-hero-actions">
                            <button class="pv-cta-secondary" onclick="switchView('settingsView')">✏️ Edit Profile</button>
                        </div>`}
                    </div>

                    <!-- Identity -->
                    <div class="pv-identity">
                        <div class="pv-name">${user.firstName} ${user.lastName}</div>
                        ${headline ? `<div class="pv-headline">${headline}</div>` : ''}
                        <div class="pv-chips">${chips}</div>
                        ${user.linkedinUrl ? `
                        <a href="${/^https?:\/\//i.test(user.linkedinUrl) ? user.linkedinUrl : 'https://' + user.linkedinUrl}"
                           target="_blank" rel="noopener noreferrer" class="pv-linkedin-link">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                            LinkedIn Profile
                        </a>` : ''}
                    </div>

                    <!-- Stats Row -->
                    <div class="pv-stat-row">
                        <div class="pv-stat-item">
                            <div class="pv-stat-num">${connCount || '—'}</div>
                            <div class="pv-stat-lbl">Connections</div>
                        </div>
                        <div class="pv-stat-item">
                            <div class="pv-stat-num">${achCount || '—'}</div>
                            <div class="pv-stat-lbl">Achievements</div>
                        </div>
                        <div class="pv-stat-item">
                            <div class="pv-stat-num">${intCount || '—'}</div>
                            <div class="pv-stat-lbl">Interests</div>
                        </div>
                    </div>
                </div>

                <!-- Body Grid -->
                <div class="pv-body">
                    <!-- Left column -->
                    <div>
                        ${user.bio ? `
                        <div class="pv-card">
                            <div class="pv-card-eyebrow">About</div>
                            <div class="pv-card-title">Who <em>${user.firstName}</em> is</div>
                            <p class="pv-bio">${user.bio}</p>
                            ${user.goals ? `
                            <div class="pv-looking-for">
                                <strong>Career Goals</strong>
                                ${user.goals}
                            </div>` : ''}
                        </div>` : ''}

                        ${(user.interests || []).length || (user.hobbies || []).length ? `
                        <div class="pv-card">
                            <div class="pv-card-eyebrow">Interests & Passions</div>
                            <div class="pv-card-title">What <em>drives</em> them</div>
                            <div class="pv-tags">
                                ${[...(user.interests || []), ...(user.hobbies || [])].map(t => `<span class="pv-tag">${t}</span>`).join('')}
                            </div>
                        </div>` : ''}

                        <div class="pv-card">
                            <div class="pv-card-eyebrow">Achievements</div>
                            <div class="pv-card-title">Their <em>journey</em> so far</div>
                            ${achHTML}
                        </div>

                        ${_pvPosts.length > 0 ? `
                        <div class="pv-card">
                            <div class="pv-card-eyebrow">Posts</div>
                            <div class="pv-card-title">${isOwnProfile ? 'Your' : `${user.firstName}'s`} <em>posts</em></div>
                            ${_pvPosts.map(post => {
                                const likeCount = _pvLikeMap[post.id] || 0;
                                const liked = _pvMyLikedSet.has(post.id);
                                const timeAgo = post.created_at ? getTimeAgo(post.created_at) : 'Recently';
                                return `
                                <div style="padding:12px 0;border-bottom:1px solid var(--border);">
                                    <p style="font-size:14px;color:var(--text);line-height:1.6;margin-bottom:8px;">${post.content}</p>
                                    <div style="display:flex;align-items:center;gap:12px;">
                                        <span style="font-size:11px;color:var(--muted);opacity:.7;">${timeAgo}</span>
                                        <button class="post-action-btn${liked ? ' liked' : ''}" id="pvlike-${post.id}" onclick="likePost('${post.id}', this)" style="font-size:12px;padding:3px 8px;${liked ? 'color:var(--primary);font-weight:700;' : ''}">👍 <span id="pvlikecount-${post.id}">${likeCount}</span></button>
                                    </div>
                                </div>`;
                            }).join('')}
                        </div>` : isOwnProfile ? `
                        <div class="pv-card">
                            <div class="pv-card-eyebrow">Posts</div>
                            <div class="pv-card-title">Your <em>posts</em></div>
                            <p style="font-size:13px;color:var(--muted);opacity:.7;">You haven't posted anything yet. Share your thoughts in the <span onclick="switchView('feedView')" style="color:var(--caramel);cursor:pointer;font-weight:600;">Feed →</span></p>
                        </div>` : ''}
                    </div>

                    <!-- Right column -->
                    <div>
                        ${actionCardHTML}

                        ${user.resume ? `
                        <div class="pv-card">
                            <div class="pv-card-eyebrow">Resume</div>
                            <div class="pv-resume-pill" onclick="openResume('${user.resume}')">
                                <div class="pv-resume-icon">📄</div>
                                <div>
                                    <div style="font-size:13.5px;font-weight:600;color:var(--espresso);">${user.firstName}'s Resume</div>
                                    <div style="font-size:11.5px;color:var(--muted);">Click to view PDF</div>
                                </div>
                                <span style="margin-left:auto;color:var(--muted);font-size:13px;">↓</span>
                            </div>
                        </div>` : ''}

                        ${user.location ? `
                        <div class="pv-card">
                            <div class="pv-card-eyebrow">Location</div>
                            <p style="font-size:14px;color:var(--muted);">📍 ${user.location}</p>
                        </div>` : ''}
                    </div>
                </div>
            `;

            switchView('profileDetailView');

            if (isOwnProfile) {
                setTimeout(() => renderBadges('profileBadges'), 50);
            }
        }

        function pvHandleConnect(btn, userId) {
            const alreadySent = sentRequests.find(r => r.connected_user_id === userId);
            if (alreadySent) return;
            connectUser(userId);
            // Update both top and card buttons
            document.querySelectorAll('#pvConnectBtnTop, #pvConnectBtn').forEach(el => {
                if (el) { el.textContent = '✓ Request Sent'; el.disabled = true; el.style.opacity = '.7'; }
            });
        }

        async function connectUser(userId) {
            if (!currentUser) return;
            if (userId === currentUser.id) return; // never connect with self

            const user = users.find(u => u.id === userId);

            // Already connected?
            const alreadyConnected = connections.find(c =>
                (c.user_id === currentUser.id && c.connected_user_id === userId) ||
                (c.user_id === userId && c.connected_user_id === currentUser.id)
            );
            if (alreadyConnected) { showToast('Already connected!', 'info'); return; }

            // Already sent a request?
            const alreadySent = sentRequests.find(c => c.connected_user_id === userId);
            if (alreadySent) { showToast('Request already sent!', 'info'); return; }

            const noteText = prompt(`Add a personal note to ${user ? user.firstName : 'this person'} (optional):`, '') ?? '';

            try {
                const { data, error } = await supabaseClient
                    .from('connections')
                    .insert([{
                        user_id: currentUser.id,
                        connected_user_id: userId,
                        status: 'pending',
                        note: noteText
                    }])
                    .select()
                    .single();

                if (error) throw error;

                sentRequests.push(data);
                showToast(`Request sent to ${user ? user.firstName : 'user'}!`, 'success');

                if (document.getElementById('profileDetailView').classList.contains('active')) {
                    viewProfile(userId);
                } else {
                    renderDiscovery();
                }
            } catch (err) {
                // Duplicate key = request already exists in DB but local state was stale
                if (err.code === '23505' || (err.message && err.message.includes('duplicate key'))) {
                    // Re-sync connection state from DB so UI reflects reality
                    try {
                        const { data: connsData } = await supabaseClient
                            .from('connections')
                            .select('*')
                            .or(`user_id.eq.${currentUser.id},connected_user_id.eq.${currentUser.id}`);
                        const allConns = connsData || [];
                        connections = allConns.filter(c => c.status === 'accepted');
                        sentRequests = allConns.filter(c => c.status === 'pending' && c.user_id === currentUser.id);
                    } catch (e) { /* ignore refresh error */ }
                    showToast('Request already sent!', 'info');
                    renderDiscovery();
                } else {
                    console.error('Error sending request:', err);
                    showToast('Failed to send request: ' + err.message, 'error');
                }
            }
        }

        async function acceptConnection(connectionId) {
            try {
                const { error } = await supabaseClient
                    .from('connections')
                    .update({ status: 'accepted' })
                    .eq('id', connectionId);

                if (error) throw error;

                pendingRequests = pendingRequests.filter(r => r.id !== connectionId);
                // Re-fetch accepted connections to ensure correct structure
                try {
                    const { data: connsData } = await supabaseClient
                        .from('connections').select('*')
                        .or(`user_id.eq.${currentUser.id},connected_user_id.eq.${currentUser.id}`);
                    if (connsData) connections = connsData.filter(c => c.status === 'accepted');
                } catch(e) {}
                showToast('Connection accepted!', 'success');
                checkBadgesWithCelebration();
                renderHubNetworkFeed();
                generateNotifications();
                renderDiscovery();
            } catch (err) {
                console.error('Error accepting connection:', err);
                showToast('Failed to accept: ' + err.message, 'error');
            }
        }

        async function rejectConnection(connectionId) {
            try {
                const { error } = await supabaseClient
                    .from('connections')
                    .delete()
                    .eq('id', connectionId);

                if (error) throw error;

                pendingRequests = pendingRequests.filter(r => r.id !== connectionId);
                showToast('Request declined.', 'info');
                renderHubNetworkFeed();
                generateNotifications();
            } catch (err) {
                console.error('Error rejecting connection:', err);
                showToast('Failed to decline: ' + err.message, 'error');
            }
        }

        // ── Meeting invite actions ──

        async function acceptMeetingInvite(meetingId) {
            try {
                const { error } = await supabaseClient
                    .from('meetings')
                    .update({ status: 'accepted' })
                    .eq('id', meetingId);
                if (error) throw error;
                const idx = meetings.findIndex(m => m.id === meetingId);
                if (idx >= 0) meetings[idx] = { ...meetings[idx], status: 'accepted' };
                showToast('Chat accepted! ☕', 'success');
                renderMeetingCards();
                updateDashboard();
            } catch (err) {
                console.error('acceptMeetingInvite:', err);
                showToast('Failed to accept: ' + err.message, 'error');
            }
        }

        async function declineMeetingInvite(meetingId) {
            try {
                const { error } = await supabaseClient
                    .from('meetings')
                    .update({ status: 'declined' })
                    .eq('id', meetingId);
                if (error) throw error;
                meetings = meetings.filter(m => m.id !== meetingId);
                showToast('Invite declined.', 'info');
                renderMeetingCards();
            } catch (err) {
                console.error('declineMeetingInvite:', err);
                showToast('Failed to decline: ' + err.message, 'error');
            }
        }

        // ── Chat Invite actions (chat_invites table) ──

        async function sendChatInvite(userId, note = '', topic = '') {
            if (!currentUser) return;
            if (sentChatInvites.find(i => i.receiver_id === userId)) {
                showToast('You already sent a chat invite to this person! ☕', 'info');
                return;
            }
            try {
                const { data, error } = await supabaseClient
                    .from('chat_invites')
                    .insert([{
                        sender_id: currentUser.id,
                        receiver_id: userId,
                        note: note,
                        topic: topic,
                        status: 'pending'
                    }])
                    .select()
                    .single();
                if (error) throw error;
                sentChatInvites.push(data);
                const partner = users.find(u => u.id === userId);
                showToast(`Chat invite sent to ${partner ? partner.firstName : 'user'}! ☕`, 'success');
                renderNwConnections();
            } catch (err) {
                console.error('sendChatInvite:', err);
                if (err.message && err.message.includes('chat_invites_unique_pending')) {
                    showToast('You already sent a chat invite to this person! ☕', 'info');
                } else {
                    showToast('Failed to send chat invite: ' + err.message, 'error');
                }
            }
        }

        async function acceptChatInvite(inviteId) {
            try {
                const { error } = await supabaseClient
                    .from('chat_invites')
                    .update({ status: 'accepted' })
                    .eq('id', inviteId);
                if (error) throw error;
                const invite = chatInvites.find(i => i.id === inviteId);
                chatInvites = chatInvites.filter(i => i.id !== inviteId);
                showToast('Coffee chat invite accepted! ☕', 'success');
                renderHubNetworkFeed();
                generateNotifications();
                // Open a chat thread with the sender
                if (invite) openChatWith(invite.sender_id);
            } catch (err) {
                console.error('acceptChatInvite:', err);
                showToast('Failed to accept: ' + err.message, 'error');
            }
        }

        async function declineChatInvite(inviteId) {
            try {
                const { error } = await supabaseClient
                    .from('chat_invites')
                    .update({ status: 'declined' })
                    .eq('id', inviteId);
                if (error) throw error;
                chatInvites = chatInvites.filter(i => i.id !== inviteId);
                showToast('Invite declined.', 'info');
                renderHubNetworkFeed();
                generateNotifications();
            } catch (err) {
                console.error('declineChatInvite:', err);
                showToast('Failed to decline: ' + err.message, 'error');
            }
        }

        async function cancelMeetingRequest(meetingId) {
            if (!confirm('Cancel this chat request?')) return;
            try {
                const { error } = await supabaseClient
                    .from('meetings')
                    .delete()
                    .eq('id', meetingId);
                if (error) throw error;
                meetings = meetings.filter(m => m.id !== meetingId);
                showToast('Chat request cancelled.', 'info');
                renderMeetingCards();
            } catch (err) {
                console.error('cancelMeetingRequest:', err);
                showToast('Failed to cancel: ' + err.message, 'error');
            }
        }

        async function cancelChatInvite(inviteId) {
            if (!confirm('Cancel this chat invite?')) return;
            try {
                const { error } = await supabaseClient
                    .from('chat_invites')
                    .delete()
                    .eq('id', inviteId);
                if (error) throw error;
                sentChatInvites = sentChatInvites.filter(i => i.id !== inviteId);
                showToast('Chat invite cancelled.', 'info');
                renderMeetingCards();
                renderNwConnections();
            } catch (err) {
                console.error('cancelChatInvite:', err);
                showToast('Failed to cancel: ' + err.message, 'error');
            }
        }

        function buildInviteCard(invite) {
            const partner = users.find(u => u.id === invite.receiver_id);
            const pFirst  = partner?.firstName || partner?.first_name || 'User';
            const pLast   = partner?.lastName  || partner?.last_name  || '';
            const role    = partner?.role    || '';
            const company = partner?.company || '';
            const initials = ((pFirst[0]||'') + (pLast[0]||'')).toUpperCase();
            const topic   = invite.topic || invite.note || '';
            const gradients = [
                'linear-gradient(135deg,#5c3317,#b5651d)',
                'linear-gradient(135deg,#2563eb,#5c9ef5)',
                'linear-gradient(135deg,#2d7a4f,#52c887)',
                'linear-gradient(135deg,#7c3aed,#a78bfa)',
                'linear-gradient(135deg,#be185d,#f472b6)',
            ];
            const gradIdx = (invite.receiver_id||'').split('').reduce((a,c)=>a+c.charCodeAt(0),0) % gradients.length;
            return `
                <div class="mc-chat-card pending">
                    <div class="mc-card-top">
                        <div class="mc-avatar-wrap">
                            <div class="mc-avatar" style="background:${gradients[gradIdx]}">${initials||'?'}</div>
                        </div>
                        <div>
                            <div class="mc-chat-name">${pFirst} ${pLast}</div>
                            <div class="mc-chat-meta">
                                ${role ? `<span>${role}</span>` : ''}
                                ${role && company ? '<span class="mc-meta-dot"></span>' : ''}
                                ${company ? `<span>${company}</span>` : ''}
                            </div>
                            ${topic ? `<div class="mc-chat-topic">${topic}</div>` : ''}
                        </div>
                        <div class="mc-card-right">
                            <span class="mc-status-badge pending">⏳ Pending</span>
                            <div style="font-size:11px;color:var(--muted);margin-top:2px;">☕ Chat invite</div>
                        </div>
                    </div>
                    <div class="mc-card-actions">
                        <span style="font-size:12px;color:var(--muted);padding:4px 8px;flex:1;">⏳ Waiting for response…</span>
                        <button class="mc-btn-sm danger" onclick="event.stopPropagation();cancelChatInvite('${invite.id}')">Cancel</button>
                    </div>
                </div>`;
        }

        // Messages
        async function startMessage(userId) {
            switchView('inboxView');
            await selectInboxConv(userId);
        }

        // ─── My Chats redesigned view ───────────────────────────────────

        let miniCalDate = new Date();

        function switchChatTab(btn, tabId) {
            document.querySelectorAll('.mc-tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const panels = ['mc-tab-upcoming','mc-tab-past','mc-tab-pending'];
            panels.forEach(id => {
                const el = document.getElementById(id);
                if (el) el.style.display = 'none';
            });
            const target = document.getElementById(tabId);
            if (target) target.style.display = tabId === 'mc-tab-upcoming' || tabId === 'mc-tab-past' ? 'flex' : 'block';
        }

        async function renderMyChatView() {
            if (!currentUser) return;

            // ── Stats ──
            const total     = meetings.length;
            const completed = meetings.filter(m => m.status === 'completed').length;
            const upcoming  = meetings.filter(m => m.status !== 'completed').length;
            const durations = meetings.map(m => Number(m.duration) || 0).filter(d => d > 0);
            const avgDur    = durations.length ? Math.round(durations.reduce((a,b)=>a+b,0)/durations.length) : 0;

            document.getElementById('mcStatTotal').textContent     = total;
            document.getElementById('mcStatCompleted').textContent = completed;
            document.getElementById('mcStatUpcoming').textContent  = upcoming;
            const avgEl = document.getElementById('mcStatAvg');
            if (avgEl) avgEl.textContent = avgDur ? avgDur + 'm' : '—';

            // ── Card lists ──
            await renderMeetingCards();

            // ── Mini calendar ──
            renderMiniCal();

        }

        async function renderMeetingCards() {
            const upcomingEl = document.getElementById('mc-tab-upcoming');
            const pastEl     = document.getElementById('mc-tab-past');
            const pendingEl  = document.getElementById('mc-tab-pending');
            if (!upcomingEl || !pastEl || !pendingEl) return;

            const now = new Date();
            const upcomingMtgs = meetings.filter(m => m.status !== 'completed' && m.status !== 'pending' && new Date(m.start_time || m.date) > now).sort((a,b)=>new Date(a.start_time||a.date)-new Date(b.start_time||b.date));
            const pastMtgs     = meetings.filter(m => m.status === 'completed' || (m.status !== 'pending' && new Date(m.start_time || m.date) <= now)).sort((a,b)=>new Date(b.start_time||b.date)-new Date(a.start_time||a.date));
            const pendingMtgs  = meetings.filter(m => m.status === 'pending');

            upcomingEl.innerHTML = upcomingMtgs.length ? upcomingMtgs.map((m,i) => buildChatCard(m, 'upcoming', i===0)).join('') : emptyMcState('📅','No upcoming chats','Schedule your next coffee chat to get started.','upcoming');
            pastEl.innerHTML     = pastMtgs.length     ? pastMtgs.map(m => buildChatCard(m,'completed',false)).join('') : emptyMcState('☕','No past chats yet','Your completed chats will appear here.','');

            const pendingHtml = [
                ...pendingMtgs.map(m => buildChatCard(m, 'pending', false)),
                ...sentChatInvites.map(inv => buildInviteCard(inv))
            ].join('');
            pendingEl.innerHTML = pendingHtml || emptyMcState('⏳','No pending requests','When you send or receive a chat request it will appear here.','pending');
        }

        function buildChatCard(m, status, featured) {
            // Resolve partner info
            const isOrganizer = m.organizer_id === currentUser?.id;
            const partnerId   = isOrganizer ? m.participant_id : m.organizer_id;
            const partner     = users.find(u => u.id === partnerId);
            const pFirst      = partner?.firstName || 'Unknown';
            const pLast       = partner?.lastName  || '';
            const initials    = (pFirst[0]||'') + (pLast[0]||'');
            const role        = partner?.role    || '';
            const company     = partner?.company || '';
            const topic       = m.description || m.topic || '';

            // Date / time
            const dtRaw = m.start_time || m.date;
            let dateStr = '—', timeStr = '';
            if (dtRaw) {
                const dt = new Date(dtRaw);
                const today = new Date();
                const tomorrow = new Date(today); tomorrow.setDate(today.getDate()+1);
                if (dt.toDateString() === today.toDateString())    dateStr = 'Today';
                else if (dt.toDateString() === tomorrow.toDateString()) dateStr = 'Tomorrow';
                else dateStr = dt.toLocaleDateString('en-US',{month:'short',day:'numeric'});
                timeStr = m.time || dt.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'});
            }

            const gradients = [
                'linear-gradient(135deg,#5c3317,#b5651d)',
                'linear-gradient(135deg,#2563eb,#5c9ef5)',
                'linear-gradient(135deg,#2d7a4f,#52c887)',
                'linear-gradient(135deg,#7c3aed,#a78bfa)',
                'linear-gradient(135deg,#be185d,#f472b6)',
            ];
            const gradIdx = (partnerId || '').split('').reduce((acc,c)=>acc+c.charCodeAt(0),0) % gradients.length;
            const gradient = gradients[gradIdx];

            const statusLabel = status === 'completed' ? '✓ Completed' : status === 'pending' ? '⏳ Pending' : 'Upcoming';
            const iceHTML = featured && status === 'upcoming' ? buildIcebreakers(partnerId) : '';
            const meetType = m.meeting_type || m.type || 'virtual';

            let actionsHTML = '';
            if (status === 'upcoming') {
                actionsHTML = `
                    <div id="meeting-detail-${m.id}">${renderMeetingAction(m, isOrganizer)}</div>
                    <div class="mc-card-actions">
                        <button class="mc-btn-sm secondary">📅 Reschedule</button>
                        <button class="mc-btn-sm secondary" onclick="event.stopPropagation();startMessage('${partnerId}')">✉ Message</button>
                        <button class="mc-btn-sm danger" onclick="event.stopPropagation()">Cancel</button>
                    </div>`;
            } else if (status === 'completed') {
                actionsHTML = `
                    <div class="mc-card-actions">
                        <button class="mc-btn-sm secondary" onclick="event.stopPropagation();openScheduleChatModalFor('${partnerId}')">🔄 Schedule Again</button>
                        <button class="mc-btn-sm secondary" onclick="event.stopPropagation();openChatWith('${partnerId}')">✉ Message</button>
                    </div>`;
            } else {
                if (isOrganizer) {
                    actionsHTML = `
                        <div class="mc-card-actions">
                            <span style="font-size:12px;color:var(--muted);padding:4px 8px;flex:1;">⏳ Waiting for response…</span>
                            <button class="mc-btn-sm danger" onclick="event.stopPropagation();cancelMeetingRequest('${m.id}')">Cancel</button>
                        </div>`;
                } else {
                    actionsHTML = `
                        <div class="mc-card-actions">
                            <button class="mc-btn-sm primary" onclick="event.stopPropagation();acceptMeetingInvite('${m.id}')">✓ Accept</button>
                            <button class="mc-btn-sm danger" onclick="event.stopPropagation();declineMeetingInvite('${m.id}')">✗ Decline</button>
                        </div>`;
                }
            }

            return `
                <div class="mc-chat-card ${status}">
                    <div class="mc-card-top">
                        <div class="mc-avatar-wrap">
                            <div class="mc-avatar" style="background:${gradient}">${initials || '?'}</div>
                        </div>
                        <div>
                            <div class="mc-chat-name">${pFirst} ${pLast}</div>
                            <div class="mc-chat-meta">
                                ${role ? `<span>${role}</span>` : ''}
                                ${role && company ? '<span class="mc-meta-dot"></span>' : ''}
                                ${company ? `<span>${company}</span>` : ''}
                                ${(role||company) && meetType ? '<span class="mc-meta-dot"></span>' : ''}
                                ${meetType ? `<span>${meetType}</span>` : ''}
                            </div>
                            ${topic ? `<div class="mc-chat-topic">${topic}</div>` : ''}
                        </div>
                        <div class="mc-card-right">
                            <span class="mc-status-badge ${status}">${statusLabel}</span>
                            <div class="mc-chat-date">${dateStr}</div>
                            ${timeStr ? `<div class="mc-chat-time">${timeStr}</div>` : ''}
                        </div>
                    </div>
                    ${iceHTML}
                    ${actionsHTML}
                </div>`;
        }

        function buildIcebreakers(partnerId) {
            const starters = getConversationStarters(partnerId).slice(0, 3);
            if (!starters.length) return '';
            const items = starters.map(s => `<div class="mc-icebr-item">💬 "${s}"</div>`).join('');
            return `<div class="mc-icebreakers"><div class="mc-icebr-label">✨ Conversation Starters</div>${items}</div>`;
        }

        function emptyMcState(icon, title, desc, tab) {
            const btn = tab ? `<button class="mc-btn-sm primary" onclick="openScheduleChatModal()">☕ Schedule a Chat</button>` : '';
            return `<div class="mc-empty"><div class="mc-empty-icon">${icon}</div><div class="mc-empty-title">${title}</div><div class="mc-empty-desc">${desc}</div>${btn}</div>`;
        }

        // ── Mini Calendar ──
        function renderMiniCal() {
            const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
            const monthEl = document.getElementById('miniCalMonth');
            const gridEl  = document.getElementById('miniCalGrid');
            if (!monthEl || !gridEl) return;

            monthEl.textContent = `${monthNames[miniCalDate.getMonth()]} ${miniCalDate.getFullYear()}`;

            const firstDay   = new Date(miniCalDate.getFullYear(), miniCalDate.getMonth(), 1);
            const lastDay    = new Date(miniCalDate.getFullYear(), miniCalDate.getMonth()+1, 0);
            const startDow   = firstDay.getDay();
            const today      = new Date();

            let html = ['Su','Mo','Tu','We','Th','Fr','Sa'].map(d=>`<div class="mc-cal-day-name">${d}</div>`).join('');
            for (let i=0; i<startDow; i++) {
                const prevDay = new Date(miniCalDate.getFullYear(), miniCalDate.getMonth(), 0-startDow+i+1);
                html += `<div class="mc-cal-day other-month">${prevDay.getDate()}</div>`;
            }
            for (let day=1; day<=lastDay.getDate(); day++) {
                const date = new Date(miniCalDate.getFullYear(), miniCalDate.getMonth(), day);
                const isToday   = today.toDateString() === date.toDateString();
                const hasEvent  = meetings.some(m => { const d=new Date(m.start_time||m.date); return d.toDateString()===date.toDateString(); });
                html += `<div class="mc-cal-day${isToday?' today':''}${hasEvent?' has-event':''}">${day}</div>`;
            }
            // Fill trailing cells
            const totalCells = startDow + lastDay.getDate();
            const remainder = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
            for (let i=1; i<=remainder; i++) html += `<div class="mc-cal-day other-month">${i}</div>`;

            gridEl.innerHTML = html;
        }

        function miniCalPrev() { miniCalDate.setMonth(miniCalDate.getMonth()-1); renderMiniCal(); }
        function miniCalNext() { miniCalDate.setMonth(miniCalDate.getMonth()+1); renderMiniCal(); }

        // ── Next Up sidebar list ──
        function renderNextUp() {
            const el = document.getElementById('mcNextUpList');
            if (!el) return;
            const monthAbbr = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
            const upcoming = meetings
                .filter(m => m.status !== 'completed')
                .sort((a,b)=>new Date(a.start_time||a.date)-new Date(b.start_time||b.date))
                .slice(0,3);

            if (!upcoming.length) { el.innerHTML = '<div style="padding:12px 18px;font-size:13px;color:var(--muted);">No upcoming chats</div>'; return; }

            el.innerHTML = upcoming.map(m => {
                const isOrganizer = m.organizer_id === currentUser?.id;
                const partnerId   = isOrganizer ? m.participant_id : m.organizer_id;
                const partner     = users.find(u => u.id === partnerId);
                const name        = partner ? `${partner.firstName} ${partner.lastName}` : 'Unknown';
                const dtRaw       = m.start_time || m.date;
                let dayNum='—', monStr='', timeStr='';
                if (dtRaw) {
                    const dt = new Date(dtRaw);
                    dayNum  = dt.getDate();
                    monStr  = monthAbbr[dt.getMonth()];
                    timeStr = m.time || dt.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'});
                }
                const dur  = m.duration ? ` · ${m.duration}m` : '';
                const mode = m.meeting_type || m.type || 'Virtual';
                return `
                    <div class="mc-upcoming-item">
                        <div class="mc-udb">
                            <div class="mc-udb-month">${monStr}</div>
                            <div class="mc-udb-day">${dayNum}</div>
                        </div>
                        <div class="mc-upcoming-info">
                            <div class="mc-upcoming-name">${name}</div>
                            <div class="mc-upcoming-time">${timeStr}${dur}</div>
                        </div>
                        <span class="mc-upcoming-mode">${mode}</span>
                    </div>`;
            }).join('');
        }

        // ── Helper: open the schedule modal (routes to existing scheduleChatModal) ──
        function openScheduleChatModal() {
            openScheduleModal();
        }

        function openScheduleChatModalFor(userId) {
            if (userId) openScheduleForUser(userId);
            else openScheduleModal();
        }

        // ─── renderMessages — loads inbox via the `inbox` view ───────
        async function renderMessages() {
            if (!currentUser) return;

            try {
                const { data: inboxData, error } = await supabaseClient
                    .from('inbox')
                    .select('*');

                if (error) throw error;

                // Batch-fetch profiles (inbox view has no FK to profiles)
                const uids = [...new Set((inboxData || []).map(r => r.other_user_id).filter(Boolean))];
                let _pmMap = {};
                if (uids.length > 0) {
                    const { data: pRows } = await supabaseClient
                        .from('profiles')
                        .select('id, first_name, last_name, profile_picture')
                        .in('id', uids);
                    (pRows || []).forEach(p => { _pmMap[p.id] = p; });
                }
                const inboxWithProfiles = (inboxData || []).map(row => ({
                    ...row,
                    other_profile: _pmMap[row.other_user_id] || null
                }));

                const list = document.getElementById('conversationList');

                if (!inboxWithProfiles || inboxWithProfiles.length === 0) {
                    list.innerHTML = '<div class="empty-state"><div class="empty-state-icon">💬</div><p>No conversations yet</p></div>';
                    document.getElementById('chatWindow').innerHTML = '<div class="chat-header"><h3>Start a conversation</h3></div>';
                    return;
                }

                list.innerHTML = inboxWithProfiles.map(conv => {
                    const profile = conv.other_profile;
                    const partnerName = profile ? `${profile.first_name} ${profile.last_name}` : 'User';
                    const fn = profile?.first_name?.[0] || '?';
                    const ln = profile?.last_name?.[0] || '?';
                    const avatarHTML = profile?.profile_picture
                        ? `<img src="${profile.profile_picture}" alt="${partnerName}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover; flex-shrink: 0;">`
                        : `<div style="width: 40px; height: 40px; border-radius: 50%; background: var(--primary); color: white; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 14px; flex-shrink: 0;">${fn}${ln}</div>`;
                    const lastMessage = (conv.last_message_preview || '').substring(0, 50);
                    const unreadBadge = (conv.unread_count > 0)
                        ? `<span style="background:var(--primary);color:white;border-radius:50%;min-width:20px;padding:2px 6px;font-size:11px;font-weight:700;text-align:center;">${conv.unread_count}</span>`
                        : '';

                    return `
                        <div class="conversation-item ${selectedConversation === conv.other_user_id ? 'active' : ''}" onclick="selectConversation('${conv.other_user_id}', '${conv.conversation_id}')" style="display: flex; align-items: center; gap: 0.75rem;">
                            ${avatarHTML}
                            <div style="flex: 1; min-width: 0;">
                                <h4 style="margin: 0;" onclick="event.stopPropagation(); viewProfile('${conv.other_user_id}')" class="conversation-name-link">${partnerName}</h4>
                                <p style="font-size: 12px; color: #999; margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${lastMessage}${lastMessage.length >= 50 ? '...' : ''}</p>
                            </div>
                            ${unreadBadge}
                        </div>
                    `;
                }).join('');
            } catch (error) {
                console.error('Error rendering messages:', error);
            }
        }

        // ─── Inbox View Functions ─────────────────────────────────────────

        let ibxAllConvs = [];

        function ibxAvatarBg(str) {
            const colors = ['#6b3f2a','#8b5040','#a0614e','#c47a3a','#5a3e2b','#4a7a5a','#3d5a7a','#7a3d5a'];
            let h = 0;
            for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) & 0xffffffff;
            return colors[Math.abs(h) % colors.length];
        }

        function ibxAvatarInner(profile) {
            const fn = profile?.first_name?.[0] || '?';
            const ln = profile?.last_name?.[0] || '?';
            if (profile?.profile_picture) {
                return `<img src="${profile.profile_picture}" alt="${fn}${ln}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
            }
            return `${fn}${ln}`;
        }

        function ibxFormatTime(isoStr) {
            if (!isoStr) return '';
            const d = new Date(isoStr);
            const now = new Date();
            const diffDays = Math.floor((now - d) / 86400000);
            if (diffDays === 0) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            if (diffDays === 1) return 'Yesterday';
            if (diffDays < 7) return d.toLocaleDateString([], { weekday: 'short' });
            return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
        }

        function ibxEscape(str) {
            return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
        }

        async function renderInboxView() {
            if (!currentUser) return;
            try {
                const { data: inboxRows, error } = await supabaseClient
                    .from('inbox')
                    .select('*');
                if (error) throw error;

                // Batch-fetch profiles for all conversation partners (inbox view has no FK to profiles)
                const userIds = [...new Set((inboxRows || []).map(r => r.other_user_id).filter(Boolean))];
                let profileMap = {};
                if (userIds.length > 0) {
                    const { data: profileRows } = await supabaseClient
                        .from('profiles')
                        .select('id, first_name, last_name, profile_picture, role, company')
                        .in('id', userIds);
                    (profileRows || []).forEach(p => { profileMap[p.id] = p; });
                }

                ibxAllConvs = (inboxRows || []).map(row => ({
                    ...row,
                    other_profile: profileMap[row.other_user_id] || null
                }));
                ibxRenderConvList(ibxAllConvs);
            } catch (err) {
                console.error('renderInboxView:', err);
                const list = document.getElementById('inboxConvList');
                if (list) list.innerHTML = `<div style="padding:20px;text-align:center;color:var(--muted);font-size:13px;">Could not load conversations.</div>`;
            }
        }

        function ibxRenderConvList(convs) {
            const list = document.getElementById('inboxConvList');
            if (!list) return;
            if (!convs || convs.length === 0) {
                list.innerHTML = `<div style="padding:32px 20px;text-align:center;">
                    <div style="font-size:28px;margin-bottom:10px;">💬</div>
                    <p style="font-size:13px;color:var(--muted);">No conversations yet.<br>Connect with someone to start chatting!</p>
                </div>`;
                return;
            }
            list.innerHTML = convs.map(conv => {
                const p = conv.other_profile;
                const name = p ? `${p.first_name} ${p.last_name}` : 'User';
                const isActive = selectedConversation === conv.other_user_id;
                const hasUnread = (conv.unread_count || 0) > 0;
                const preview = ibxEscape((conv.last_message_preview || 'No messages yet').substring(0, 60));
                const timeStr = ibxFormatTime(conv.last_message_at);
                const bg = ibxAvatarBg((p?.first_name || '') + (p?.last_name || '') + (conv.other_user_id || ''));
                const avInner = ibxAvatarInner(p);
                return `<div class="ibx-conv-row ${isActive ? 'active' : ''} ${hasUnread ? 'unread' : ''}"
                             onclick="selectInboxConv('${conv.other_user_id}','${conv.conversation_id}')">
                    <div class="ibx-conv-av">
                        <div class="ibx-conv-av-inner" style="background:${bg};">${avInner}</div>
                    </div>
                    <div class="ibx-conv-body">
                        <div class="ibx-conv-top">
                            <span class="ibx-conv-name">${ibxEscape(name)}</span>
                            <span class="ibx-conv-time">${timeStr}</span>
                        </div>
                        <div style="display:flex;align-items:center;gap:4px;">
                            <span class="ibx-conv-preview">${preview}</span>
                            ${hasUnread ? '<div class="ibx-unread-dot"></div>' : ''}
                        </div>
                    </div>
                    ${hasUnread ? `<span class="ibx-unread-badge">${conv.unread_count}</span>` : ''}
                </div>`;
            }).join('');
        }

        function filterInboxConvs() {
            const q = (document.getElementById('inboxSearchInput')?.value || '').toLowerCase();
            if (!q) { ibxRenderConvList(ibxAllConvs); return; }
            const filtered = ibxAllConvs.filter(c => {
                const p = c.other_profile;
                const name = `${p?.first_name || ''} ${p?.last_name || ''}`.toLowerCase();
                return name.includes(q) || (c.last_message || '').toLowerCase().includes(q);
            });
            ibxRenderConvList(filtered);
        }

        async function selectInboxConv(userId, conversationId = null) {
            if (!currentUser) return;
            selectedConversation = userId;
            selectedConversationId = conversationId;

            // Update active state in list
            document.querySelectorAll('.ibx-conv-row').forEach(r => r.classList.remove('active'));
            const activeRow = document.querySelector(`.ibx-conv-row[onclick*="'${userId}'"]`);
            if (activeRow) activeRow.classList.add('active');

            // Show chat area; on mobile switch to chat panel
            const empty = document.getElementById('inboxEmptyState');
            const area = document.getElementById('inboxChatArea');
            if (empty) empty.style.display = 'none';
            if (area) area.style.display = 'flex';
            const shell = document.querySelector('.ibx-shell');
            if (shell) shell.classList.add('chat-open');

            try {
                let messagesData = [];
                if (!selectedConversationId) {
                    const { data: convRow } = await supabaseClient
                        .from('conversations')
                        .select('id')
                        .or(`and(participant_a.eq.${currentUser.id},participant_b.eq.${userId}),and(participant_a.eq.${userId},participant_b.eq.${currentUser.id})`)
                        .maybeSingle();
                    selectedConversationId = convRow?.id || null;
                }
                if (selectedConversationId) {
                    const { data, error } = await supabaseClient
                        .from('messages')
                        .select('*')
                        .eq('conversation_id', selectedConversationId)
                        .order('created_at', { ascending: true });
                    if (!error) messagesData = data || [];
                }

                const { data: profile } = await supabaseClient
                    .from('profiles')
                    .select('first_name, last_name, profile_picture, role, company')
                    .eq('id', userId)
                    .maybeSingle();

                const partnerName = profile ? `${profile.first_name} ${profile.last_name}` : 'User';
                const bg = ibxAvatarBg((profile?.first_name || '') + (profile?.last_name || '') + userId);
                const avInner = ibxAvatarInner(profile);
                const sub = [profile?.role, profile?.company].filter(Boolean).join(' · ') || 'Coffee Chat Member';

                // Render header
                const header = document.getElementById('inboxChatHeader');
                if (header) {
                    header.innerHTML = `
                        <button class="ibx-mob-back" onclick="ibxBackToList()">← Back</button>
                        <div class="ibx-ch-av" style="background:${bg};">${avInner}</div>
                        <div class="ibx-ch-info">
                            <div class="ibx-ch-name">${ibxEscape(partnerName)}</div>
                            <div class="ibx-ch-sub">${ibxEscape(sub)}</div>
                        </div>
                        <div class="ibx-ch-actions">
                            <div class="ibx-icon-btn" title="Schedule a chat" onclick="scheduleWith('${userId}')">☕</div>
                            <div class="ibx-icon-btn" title="View profile" onclick="viewProfile('${userId}')">👤</div>
                        </div>`;
                }

                // Render messages
                ibxRenderMessages(messagesData, profile, partnerName, bg, userId);

                // Update placeholder
                const textarea = document.getElementById('inboxMsgInput');
                if (textarea) textarea.placeholder = `Message ${profile?.first_name || 'them'}…`;

                // Mark as read
                if (selectedConversationId) {
                    await supabaseClient.from('messages')
                        .update({ read: true })
                        .eq('conversation_id', selectedConversationId)
                        .eq('receiver_id', currentUser.id);
                }
                // Clear unread indicators
                if (activeRow) {
                    activeRow.querySelector('.ibx-unread-dot')?.remove();
                    activeRow.querySelector('.ibx-unread-badge')?.remove();
                    activeRow.classList.remove('unread');
                }
            } catch (err) {
                console.error('selectInboxConv:', err);
            }
        }

        function ibxRenderMessages(messagesData, profile, partnerName, bg, userId) {
            const thread = document.getElementById('inboxThread');
            if (!thread) return;

            if (!messagesData || messagesData.length === 0) {
                const icebreakers = getConversationStarters(userId);
                thread.innerHTML = `<div style="text-align:center;padding:32px 20px;display:flex;flex-direction:column;align-items:center;justify-content:center;flex:1;">
                    <div style="font-size:28px;margin-bottom:12px;">👋</div>
                    <p style="font-size:14px;color:var(--muted);margin-bottom:16px;">Start your conversation with <strong>${ibxEscape(partnerName)}</strong>!</p>
                    ${icebreakers.length ? `<p style="font-size:12px;color:var(--caramel);font-weight:600;margin-bottom:10px;">Try an icebreaker:</p>
                    <div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center;max-width:400px;">
                        ${icebreakers.map(s => `<button onclick="ibxUseIcebreaker(this)"
                            style="background:var(--card);border:1.5px solid var(--border);border-radius:99px;padding:6px 14px;font-size:12px;color:var(--espresso);cursor:pointer;font-family:inherit;transition:all .15s;"
                            onmouseover="this.style.borderColor='var(--caramel)'"
                            onmouseout="this.style.borderColor='var(--border)'">${ibxEscape(s)}</button>`).join('')}
                    </div>` : ''}
                </div>`;
                thread.scrollTop = thread.scrollHeight;
                return;
            }

            let lastDate = '';
            let lastSenderId = null;
            let html = '<div class="ibx-msg-group">';

            messagesData.forEach(m => {
                const d = new Date(m.created_at);
                const msgDate = d.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' });
                const todayDate = new Date().toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' });
                const yestDate = new Date(Date.now() - 86400000).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' });
                const dateLabel = msgDate === todayDate ? 'Today' : msgDate === yestDate ? 'Yesterday' : msgDate;
                if (msgDate !== lastDate) {
                    html += `<div class="ibx-date-divider"><span>${dateLabel}</span></div>`;
                    lastDate = msgDate;
                    lastSenderId = null;
                }

                const isMine = m.sender_id === currentUser.id;
                const showAv = !isMine && m.sender_id !== lastSenderId;
                const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const avInner = ibxAvatarInner(profile);

                html += `<div class="ibx-msg-row ${isMine ? 'mine' : ''}">
                    ${!isMine ? `<div class="ibx-msg-av ${showAv ? '' : 'hidden'}" style="background:${bg};">${avInner}</div>` : ''}
                    <div class="ibx-bubble">${ibxEscape(m.content)}</div>
                    <span class="ibx-msg-time">${timeStr}</span>
                </div>`;
                lastSenderId = m.sender_id;
            });
            html += '</div>';
            thread.innerHTML = html;
            thread.scrollTop = thread.scrollHeight;
        }

        function ibxUseIcebreaker(btn) {
            const input = document.getElementById('inboxMsgInput');
            if (input) {
                input.value = btn.textContent.trim();
                ibxAutoResize(input);
                input.focus();
            }
        }

        function ibxBackToList() {
            const shell = document.querySelector('.ibx-shell');
            if (shell) shell.classList.remove('chat-open');
        }

        function ibxAutoResize(el) {
            el.style.height = 'auto';
            el.style.height = Math.min(el.scrollHeight, 120) + 'px';
        }

        function ibxHandleKey(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                ibxSend();
            }
        }

        async function getOrCreateConversation(otherUserId) {
            const orFilter = `and(participant_a.eq.${currentUser.id},participant_b.eq.${otherUserId}),and(participant_a.eq.${otherUserId},participant_b.eq.${currentUser.id})`;
            const { data: existing } = await supabaseClient
                .from('conversations').select('id').or(orFilter).maybeSingle();
            if (existing) return existing.id;
            const { data: newConv, error } = await supabaseClient
                .from('conversations')
                .insert({ participant_a: currentUser.id, participant_b: otherUserId })
                .select('id').single();
            if (error) {
                // Unique constraint: other user created the conversation simultaneously — retry select
                if (error.code === '23505') {
                    const { data: retry } = await supabaseClient
                        .from('conversations').select('id').or(orFilter).maybeSingle();
                    if (retry) return retry.id;
                }
                throw error;
            }
            return newConv.id;
        }

        async function ibxSend() {
            if (!currentUser || !selectedConversation) return;
            const input = document.getElementById('inboxMsgInput');
            const text = input?.value.trim();
            if (!text) return;

            try {
                selectedConversationId = selectedConversationId || await getOrCreateConversation(selectedConversation);

                const { error } = await supabaseClient
                    .from('messages')
                    .insert([{
                        sender_id: currentUser.id,
                        receiver_id: selectedConversation,
                        conversation_id: selectedConversationId,
                        content: text,
                        message_type: 'text'
                    }]);
                if (error) throw error;

                const sentText = text;
                input.value = '';
                input.style.height = 'auto';
                sentMessageCount++;

                // Refresh only the message thread; update conv list preview inline (no round-trip)
                await selectInboxConv(selectedConversation, selectedConversationId);
                const _convRow = document.querySelector(`.ibx-conv-row[onclick*="'${selectedConversation}'"]`);
                if (_convRow) {
                    const _prev = _convRow.querySelector('.ibx-conv-preview');
                    if (_prev) _prev.textContent = sentText.substring(0, 60);
                    const _time = _convRow.querySelector('.ibx-conv-time');
                    if (_time) _time.textContent = ibxFormatTime(new Date().toISOString());
                    _convRow.classList.add('active');
                }
            } catch (err) {
                console.error('ibxSend:', err);
                showToast('Failed to send message', 'error');
            }
        }

        // ─── New Message Modal ────────────────────────────────────────────

        let ibxNmAllConns = [];

        async function ibxOpenNewMessage() {
            if (!currentUser) return;
            document.getElementById('ibxNmOverlay').style.display = 'flex';
            document.getElementById('ibxNmSearchInput').value = '';
            document.getElementById('ibxNmList').innerHTML = '<div style="padding:24px;text-align:center;color:var(--muted);font-size:13px;">Loading…</div>';
            try {
                const { data, error } = await supabaseClient
                    .from('connections')
                    .select(`
                        id,
                        user_id, connected_user_id,
                        user_profile:profiles!connections_user_id_fkey(id, first_name, last_name, profile_picture, role, company),
                        connected_profile:profiles!connections_connected_user_id_fkey(id, first_name, last_name, profile_picture, role, company)
                    `)
                    .or(`user_id.eq.${currentUser.id},connected_user_id.eq.${currentUser.id}`)
                    .eq('status', 'accepted');
                if (error) throw error;
                ibxNmAllConns = (data || []).map(c => {
                    const isA = c.user_id === currentUser.id;
                    const profile = isA ? c.connected_profile : c.user_profile;
                    return { userId: profile?.id, profile };
                }).filter(c => c.userId);
                ibxNmRenderList(ibxNmAllConns);
            } catch (err) {
                console.error('ibxOpenNewMessage:', err);
                document.getElementById('ibxNmList').innerHTML = '<div style="padding:24px;text-align:center;color:var(--muted);font-size:13px;">Could not load connections.</div>';
            }
            setTimeout(() => document.getElementById('ibxNmSearchInput')?.focus(), 50);
        }

        function ibxCloseNewMessage() {
            document.getElementById('ibxNmOverlay').style.display = 'none';
        }

        function ibxFilterNewMsg() {
            const q = (document.getElementById('ibxNmSearchInput')?.value || '').toLowerCase();
            if (!q) { ibxNmRenderList(ibxNmAllConns); return; }
            ibxNmRenderList(ibxNmAllConns.filter(c => {
                const p = c.profile;
                return `${p?.first_name || ''} ${p?.last_name || ''}`.toLowerCase().includes(q);
            }));
        }

        function ibxNmRenderList(conns) {
            const list = document.getElementById('ibxNmList');
            if (!list) return;
            if (!conns.length) {
                list.innerHTML = '<div style="padding:24px;text-align:center;color:var(--muted);font-size:13px;">No connections found.</div>';
                return;
            }
            list.innerHTML = conns.map(c => {
                const p = c.profile;
                const name = p ? `${p.first_name} ${p.last_name}` : 'User';
                const sub = [p?.role, p?.company].filter(Boolean).join(' · ') || 'Coffee Chat Member';
                const bg = ibxAvatarBg((p?.first_name || '') + (p?.last_name || '') + (c.userId || ''));
                const avInner = ibxAvatarInner(p);
                return `<div class="ibx-nm-row" onclick="ibxStartConvWith('${c.userId}')">
                    <div class="ibx-nm-av" style="background:${bg};">${avInner}</div>
                    <div class="ibx-nm-info">
                        <div class="ibx-nm-name">${ibxEscape(name)}</div>
                        <div class="ibx-nm-sub">${ibxEscape(sub)}</div>
                    </div>
                </div>`;
            }).join('');
        }

        function ibxStartConvWith(userId) {
            ibxCloseNewMessage();
            switchView('inboxView');
            selectInboxConv(userId);
        }

        // ─── End Inbox View Functions ─────────────────────────────────────

        async function selectConversation(userId, conversationId = null) {
            if (!currentUser) return;

            selectedConversation = userId;
            selectedConversationId = conversationId;

            try {
                let messagesData = [];
                let partnerName = 'User';

                // Look up conversation_id if not provided
                if (!selectedConversationId) {
                    const { data: convRow } = await supabaseClient
                        .from('conversations')
                        .select('id')
                        .or(`and(participant_a.eq.${currentUser.id},participant_b.eq.${userId}),and(participant_a.eq.${userId},participant_b.eq.${currentUser.id})`)
                        .maybeSingle();
                    selectedConversationId = convRow?.id || null;
                }

                if (selectedConversationId) {
                    const { data, error } = await supabaseClient
                        .from('messages')
                        .select('*')
                        .eq('conversation_id', selectedConversationId)
                        .order('created_at', { ascending: true });
                    if (error) throw error;
                    messagesData = data || [];
                }

                const { data: profile } = await supabaseClient
                    .from('profiles')
                    .select('first_name, last_name')
                    .eq('id', userId)
                    .maybeSingle();

                partnerName = profile ? `${profile.first_name} ${profile.last_name}` : 'User';

                const icebreakers = getConversationStarters(userId);
                const icebreakerHTML = (!messagesData || messagesData.length === 0) ? `
                    <div style="text-align: center; padding: 2rem;">
                        <p style="font-size: 14px; color: #999; margin-bottom: 1rem;">Start a conversation with ${partnerName}!</p>
                        <p style="font-size: 13px; color: var(--primary); font-weight: 600; margin-bottom: 0.75rem;">Try one of these icebreakers:</p>
                        ${icebreakers.map(starter => `
                            <button class="btn btn-secondary btn-sm"
                                onclick="useIcebreaker('${userId}', this.textContent.trim())"
                                style="margin: 0.25rem; font-size: 12px; text-align: left;">
                                ${starter}
                            </button>
                        `).join('')}
                    </div>
                ` : '';

                const chatWindow = document.getElementById('chatWindow');
                chatWindow.innerHTML = `
                    <div class="chat-header">
                        <div>
                            <h3 style="margin: 0;">${partnerName}</h3>
                        </div>
                        <button class="btn btn-accent btn-sm" onclick="scheduleWith('${userId}')">Schedule Chat</button>
                    </div>
                    <div class="chat-messages" id="chatMessagesContainer">
                        ${icebreakerHTML}
                        ${messagesData.map(m => `
                            <div class="message ${m.sender_id === currentUser.id ? 'sent' : 'received'}">
                                <div class="message-content">${m.content}</div>
                            </div>
                        `).join('')}
                    </div>
                    <div class="chat-input">
                        <input type="text" id="messageInput" placeholder="Type a message..." onkeypress="if(event.key==='Enter') sendMessage('${userId}')">
                        <button class="btn btn-primary btn-sm" onclick="sendMessage('${userId}')">Send</button>
                    </div>
                `;

                // Scroll to bottom
                const container = document.getElementById('chatMessagesContainer');
                if (container) {
                    container.scrollTop = container.scrollHeight;
                }

                // Mark messages as read
                if (selectedConversationId) {
                    await supabaseClient
                        .from('messages')
                        .update({ read: true })
                        .eq('conversation_id', selectedConversationId)
                        .eq('receiver_id', currentUser.id);
                } else {
                    await supabaseClient
                        .from('messages')
                        .update({ read: true })
                        .eq('receiver_id', currentUser.id)
                        .eq('sender_id', userId);
                }

            } catch (error) {
                console.error('Error selecting conversation:', error);
            }
        }

        async function sendMessage(userId) {
            if (!currentUser) return;

            const input = document.getElementById('messageInput');
            const text = input.value.trim();
            if (!text) return;

            try {
                // Step 1: get or create the conversation thread
                const conversationId = selectedConversationId || await getOrCreateConversation(userId);
                selectedConversationId = conversationId;

                // Step 2: insert message with conversation_id
                const { error } = await supabaseClient
                    .from('messages')
                    .insert([{
                        sender_id: currentUser.id,
                        receiver_id: userId,
                        conversation_id: conversationId,
                        content: text,
                        message_type: 'text'
                    }]);

                if (error) throw error;

                sentMessageCount++;
                input.value = '';
                await selectConversation(userId, conversationId);
            } catch (error) {
                console.error('Error sending message:', error);
                showToast('Failed to send message: ' + error.message, 'error');
            }
        }

        function getConversationStarters(userId) {
            const partner = users.find(u => u.id === userId);
            const starters = [];

            if (partner) {
                if (partner.industry) {
                    starters.push(`What got you interested in ${partner.industry}?`);
                }
                if (partner.role && partner.company) {
                    starters.push(`How's ${partner.role} year going at ${partner.company}?`);
                } else if (partner.company) {
                    starters.push(`How do you like it at ${partner.company}?`);
                }
                if (partner.interests && partner.interests.length > 0) {
                    starters.push(`I noticed we share an interest in ${partner.interests[0]}!`);
                }
                if (partner.goals) {
                    starters.push(`What's your game plan for breaking into the industry after graduation?`);
                }
            }

            const generic = [
                "What's been the highlight of your semester so far?",
                "Any good books, podcasts, or classes you'd recommend?",
                "What project or internship are you most excited about right now?"
            ];

            return [...starters, ...generic].slice(0, 4);
        }

        function useIcebreaker(userId, text) {
            const input = document.getElementById('messageInput');
            if (input) {
                input.value = text;
                input.focus();
                localStorage.setItem('usedIcebreaker', 'true');
            }
        }

        // Groups
        function renderGroups() {
            const list = document.getElementById('groupsList');
            list.innerHTML = groups.map(group => {
                const joined = myGroupIds.has(group.id);
                return `
                <div class="group-card">
                    <div class="group-header">
                        <div>
                            <h3 style="margin-bottom: 0.25rem;">${group.name}</h3>
                            <span class="industry-pill">${group.industry || ''}</span>
                        </div>
                    </div>
                    <p style="font-size: 13px; color: #666; margin: 0.5rem 0;">${group.description || ''}</p>
                    <div class="group-meta">
                        <span>&#128101; ${group.member_count || 0} members</span>
                    </div>
                    ${joined ?
                        `<button class="btn btn-accent" onclick="viewGroup('${group.id}')" style="width: 100%; margin-top: 0.75rem;">View Group</button>` :
                        `<button class="btn btn-primary" onclick="joinGroup('${group.id}')" style="width: 100%; margin-top: 0.75rem;">Join Group</button>`
                    }
                </div>`;
            }).join('') || '<div class="empty-state"><p>No groups available yet</p></div>';

            const myGroups = groups.filter(g => myGroupIds.has(g.id));
            const myList = document.getElementById('myGroupsList');
            if (myGroups.length === 0) {
                myList.innerHTML = '<div class="empty-state"><p>Join groups to connect with your community</p></div>';
            } else {
                myList.innerHTML = myGroups.map(group => `
                    <div class="group-card" onclick="viewGroup('${group.id}')" style="cursor: pointer; margin-bottom: 0.75rem;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <h3 style="color: var(--primary); margin-bottom: 0.25rem;">&#10003; ${group.name}</h3>
                                <div class="group-meta" style="margin: 0;">
                                    <span>&#128101; ${group.member_count || 0} members</span>
                                </div>
                            </div>
                            <span style="color: var(--accent); font-size: 18px;">&rarr;</span>
                        </div>
                    </div>`
                ).join('');
            }
        }

        async function viewGroup(groupId) {
            const group = groups.find(g => g.id === groupId);
            if (!group) return;

            switchView('groupDetailView');
            const content = document.getElementById('groupDetailContent');
            content.innerHTML = '<div class="empty-state"><p>Loading group...</p></div>';

            try {
                // Load group posts with author profiles
                const { data: postsData } = await supabaseClient
                    .from('posts')
                    .select('*, profiles!posts_author_id_fkey(first_name, last_name)')
                    .eq('group_id', groupId)
                    .order('created_at', { ascending: false });

                // Load group members with profiles
                const { data: membersData } = await supabaseClient
                    .from('group_members')
                    .select('user_id, profiles!group_members_user_id_fkey(id, first_name, last_name, industry, role, company)')
                    .eq('group_id', groupId);

                const memberCards = (membersData || []).map(m => {
                    const p = m.profiles;
                    if (!p) return '';
                    const isConnected = connections.find(c =>
                        (c.user_id === currentUser.id && c.connected_user_id === p.id) ||
                        (c.connected_user_id === currentUser.id && c.user_id === p.id)
                    );
                    return `
                        <div class="card compact" style="display: flex; align-items: center; gap: 1rem; margin-bottom: 0.75rem;">
                            <div class="person-avatar" style="width: 44px; height: 44px; font-size: 16px; flex-shrink: 0;">${p.first_name[0]}${p.last_name[0]}</div>
                            <div style="flex: 1; min-width: 0;">
                                <strong style="font-size: 14px;">${p.first_name} ${p.last_name}</strong>
                                <p style="font-size: 12px; color: #999; margin: 0;">${p.role || p.industry || ''}</p>
                            </div>
                            <div style="display: flex; gap: 0.5rem; flex-shrink: 0;">
                                <button class="btn btn-secondary btn-sm" onclick="viewProfile('${p.id}')" style="font-size: 11px; padding: 4px 10px;">View</button>
                                ${p.id !== currentUser.id ? (isConnected ? `<span style="font-size: 11px; color: var(--success);">&#10003; Connected</span>` : `<button class="btn btn-primary btn-sm" onclick="connectUser('${p.id}')" style="font-size: 11px; padding: 4px 10px;">Connect</button>`) : ''}
                            </div>
                        </div>`;
                }).join('');

                const postsHTML = (postsData || []).map(post => {
                    const authorName = post.profiles ? `${post.profiles.first_name} ${post.profiles.last_name}` : 'Member';
                    const timeAgo = post.created_at ? getTimeAgo(post.created_at) : '';
                    return `
                        <div style="padding: 1rem; border: 1px solid var(--border); border-radius: 8px; margin-bottom: 1rem;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                                <strong>${authorName}</strong>
                                <span style="font-size: 11px; color: #999;">${timeAgo}</span>
                            </div>
                            <p style="color: #444; margin-bottom: 0.75rem;">${post.content}</p>
                            <div class="post-actions" style="padding-top: 0.5rem; border-top: 1px solid var(--border);">
                                <button class="post-action-btn" onclick="likeGroupPost('${post.id}', '${groupId}')">&#128077; ${post.likes_count || 0} Likes</button>
                                <button class="post-action-btn" onclick="toggleGroupDetailComments('${post.id}')">&#128172; Comment</button>
                            </div>
                            <div id="gd-comments-${post.id}" style="display: none; margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid var(--border);">
                                <div id="gd-comments-list-${post.id}" style="margin-bottom: 0.5rem;"></div>
                                <div style="display: flex; gap: 0.5rem; margin-top: 0.5rem;">
                                    <input type="text" id="gci-${post.id}" placeholder="Write a comment..." style="flex: 1; padding: 6px 10px; border-radius: 6px; border: 1px solid var(--border); font-size: 13px;" onkeypress="if(event.key==='Enter') submitGroupComment('${post.id}', '${groupId}')">
                                    <button class="btn btn-primary btn-sm" onclick="submitGroupComment('${post.id}', '${groupId}')" style="font-size: 12px; padding: 4px 10px;">Post</button>
                                </div>
                            </div>
                        </div>`;
                }).join('') || '<p style="color: #999;">No posts yet. Start the conversation!</p>';

                content.innerHTML = `
                    <div style="background: white; border-radius: 12px; padding: 2rem; border: 1px solid var(--border); margin-bottom: 2rem;">
                        <h1 style="margin-bottom: 0.5rem;">${group.name}</h1>
                        <p style="color: #666; margin-bottom: 0.5rem;">${group.description || ''}</p>
                        <div class="group-meta">
                            <span>&#128101; ${group.member_count || 0} members</span>
                            <span class="industry-pill">${group.industry || ''}</span>
                        </div>
                    </div>

                    <div style="background: white; border-radius: 12px; padding: 2rem; border: 1px solid var(--border); margin-bottom: 2rem;">
                        <h3 style="margin-bottom: 1rem;">Group Discussion</h3>
                        <div style="display: flex; gap: 0.5rem; margin-bottom: 1.5rem;">
                            <input type="text" id="groupPostInput" placeholder="Share something with the group..." style="flex: 1; padding: 10px; border-radius: 8px; border: 1px solid var(--border);" onkeypress="if(event.key==='Enter') postToGroup('${groupId}')">
                            <button class="btn btn-primary btn-sm" onclick="postToGroup('${groupId}')">Post</button>
                        </div>
                        <div id="groupPosts-${groupId}">${postsHTML}</div>
                    </div>

                    <div style="background: white; border-radius: 12px; padding: 2rem; border: 1px solid var(--border);">
                        <h3 style="margin-bottom: 1rem;">Members (${(membersData || []).length})</h3>
                        ${memberCards || '<p style="color: #999;">No members yet</p>'}
                    </div>
                `;
            } catch (err) {
                console.error('Error loading group:', err);
                content.innerHTML = '<div class="empty-state"><p>Failed to load group. Please try again.</p></div>';
            }
        }

        function toggleGroupDetailComments(postId) {
            const el = document.getElementById(`gd-comments-${postId}`);
            if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
        }

        async function postToGroup(groupId) {
            const input = document.getElementById('groupPostInput');
            const text = input.value.trim();
            if (!text || !currentUser) return;

            try {
                const { error } = await supabaseClient
                    .from('posts')
                    .insert([{
                        author_id: currentUser.id,
                        content: text,
                        group_id: groupId
                    }]);

                if (error) throw error;

                input.value = '';
                await viewGroup(groupId);
                showToast('Posted to group!', 'success');
            } catch (err) {
                console.error('Error posting to group:', err);
                showToast('Failed to post: ' + err.message, 'error');
            }
        }

        async function likeGroupPost(postId, groupId) {
            if (!currentUser) return;
            try {
                const { data: existing } = await supabaseClient
                    .from('post_likes')
                    .select('id')
                    .eq('post_id', postId)
                    .eq('user_id', currentUser.id)
                    .maybeSingle();

                if (existing) {
                    await supabaseClient.from('post_likes').delete().eq('id', existing.id);
                } else {
                    await supabaseClient.from('post_likes').insert([{ post_id: postId, user_id: currentUser.id }]);
                }
                await viewGroup(groupId);
            } catch (err) {
                console.error('Error liking post:', err);
            }
        }

        async function submitGroupComment(postId, groupId) {
            const input = document.getElementById(`gci-${postId}`);
            if (!input) return;
            const text = input.value.trim();
            if (!text || !currentUser) return;

            try {
                const { error } = await supabaseClient
                    .from('post_comments')
                    .insert([{ post_id: postId, user_id: currentUser.id, content: text }]);

                if (error) throw error;
                await viewGroup(groupId);
            } catch (err) {
                console.error('Error submitting comment:', err);
                showToast('Failed to submit comment', 'error');
            }
        }

        function shareGroupPost(postId, content) {
            if (navigator.share) {
                navigator.share({ title: 'First Sip Group Post', text: content });
            } else {
                navigator.clipboard.writeText(content).then(() => {
                    showToast('Post copied to clipboard!', 'info');
                });
            }
        }

        async function joinGroup(groupId) {
            const group = groups.find(g => g.id === groupId);
            if (!group || myGroupIds.has(groupId)) return;

            try {
                const { error } = await supabaseClient
                    .from('group_members')
                    .insert([{ group_id: groupId, user_id: currentUser.id }]);

                if (error) throw error;

                myGroupIds.add(groupId);
                group.member_count = (group.member_count || 0) + 1; // optimistic local update (DB trigger handles the real count)

                renderGroups();
                showToast(`Joined ${group.name}!`, 'success');
                checkBadgesWithCelebration();
            } catch (err) {
                console.error('Error joining group:', err);
                showToast('Failed to join group: ' + err.message, 'error');
            }
        }

        async function createGroup() {
            const name = document.getElementById('newGroupName').value.trim();
            const industry = document.getElementById('newGroupIndustry').value;
            const description = document.getElementById('newGroupDescription').value.trim();
            const errEl = document.getElementById('createGroupError');
            const btn = document.getElementById('createGroupBtn');

            errEl.style.display = 'none';

            if (!name) { errEl.textContent = 'Please enter a group name.'; errEl.style.display = 'block'; return; }
            if (!industry) { errEl.textContent = 'Please select an industry/focus area.'; errEl.style.display = 'block'; return; }
            if (!description) { errEl.textContent = 'Please add a short description.'; errEl.style.display = 'block'; return; }

            btn.disabled = true;
            btn.textContent = 'Creating…';

            try {
                const { data: newGroup, error } = await supabaseClient
                    .from('groups')
                    .insert([{ name, industry, description, creator_id: currentUser.id, member_count: 1 }])
                    .select()
                    .single();

                if (error) throw error;

                // Auto-join the creator as admin
                await supabaseClient
                    .from('group_members')
                    .insert([{ group_id: newGroup.id, user_id: currentUser.id, role: 'admin' }]);

                groups.unshift(newGroup);
                myGroupIds.add(newGroup.id);

                // Reset form
                document.getElementById('newGroupName').value = '';
                document.getElementById('newGroupIndustry').value = '';
                document.getElementById('newGroupDescription').value = '';
                document.getElementById('newGroupDescCount').textContent = '0 / 300';

                closeModal('createGroupModal');
                renderGroups();
                showToast(`"${newGroup.name}" created!`, 'success');
            } catch (err) {
                console.error('Error creating group:', err);
                errEl.textContent = 'Failed to create group: ' + err.message;
                errEl.style.display = 'block';
            } finally {
                btn.disabled = false;
                btn.textContent = 'Create Group';
            }
        }

        // Calendar
        function renderCalendar() {
            renderCalendarGrid();
        }

        function renderCalendarView() {
            renderCalendarGrid();
            renderMeetingsList();
        }

        function renderCalendarGrid() {
            const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'];
            
            document.getElementById('currentMonth').textContent = `${monthNames[currentMonth.getMonth()]} ${currentMonth.getFullYear()}`;

            const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
            const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
            const daysInMonth = lastDay.getDate();
            const startingDayOfWeek = firstDay.getDay();

            const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            let html = days.map(day => `<div class="calendar-day-header">${day}</div>`).join('');

            for (let i = 0; i < startingDayOfWeek; i++) {
                html += '<div class="calendar-day other-month"></div>';
            }

            for (let day = 1; day <= daysInMonth; day++) {
                const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
                const isToday = new Date().toDateString() === date.toDateString();
                const hasEvent = meetings.some(m => new Date(m.date).toDateString() === date.toDateString());
                
                html += `<div class="calendar-day ${isToday ? 'today' : ''} ${hasEvent ? 'has-event' : ''}">${day}</div>`;
            }

            document.getElementById('calendarGrid').innerHTML = html;
        }

        function renderMeetingsList() {
            const list = document.getElementById('meetingsList');
            const upcomingMeetings = meetings.filter(m => m.status !== 'completed').sort((a, b) => new Date(a.date) - new Date(b.date));

            if (upcomingMeetings.length === 0) {
                list.innerHTML = '<div class="empty-state"><p>No upcoming meetings</p></div>';
                return;
            }

            list.innerHTML = upcomingMeetings.map(meeting => `
                <div class="meeting-card">
                    <div class="meeting-header">
                        <div>
                            <p class="meeting-time">${new Date(meeting.date).toLocaleDateString()} at ${meeting.time}</p>
                            <h3 style="margin: 0.5rem 0 0.25rem;">${meeting.personName}</h3>
                            <p style="font-size: 13px; color: #999; margin: 0;">${meeting.topic}</p>
                            <p style="font-size: 12px; color: #666; margin-top: 0.25rem;">Type: ${meeting.type}</p>
                        </div>
                        <span class="meeting-status ${meeting.status}">${meeting.status.charAt(0).toUpperCase() + meeting.status.slice(1)}</span>
                    </div>
                    <div class="meeting-actions">
                        <button class="btn btn-primary btn-sm" onclick="startCall('${meeting.personName}', '${meeting.personName[0]}')">Start Call</button>
                        <button class="btn btn-secondary btn-sm">Reschedule</button>
                    </div>
                </div>
            `).join('');
        }

        function previousMonth() {
            currentMonth.setMonth(currentMonth.getMonth() - 1);
            renderCalendarGrid();
        }

        function nextMonth() {
            currentMonth.setMonth(currentMonth.getMonth() + 1);
            renderCalendarGrid();
        }

        // Schedule Meeting
        function scheduleWith(userId) {
            const user = users.find(u => u.id === userId);
            selectedPerson = user;
            previousView = 'profileDetailView';

            document.getElementById('scheduleName').textContent = `${user.firstName} ${user.lastName}`;
            
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            document.getElementById('scheduleDate').value = tomorrow.toISOString().split('T')[0];

            renderTimeSlots();
            document.getElementById('scheduleDate').onchange = renderTimeSlots;

            switchView('scheduleView');
        }

        function renderTimeSlots() {
            const times = [];
            for (let hour = 9; hour < 17; hour++) {
                for (let min of [0, 30]) {
                    const time = `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
                    times.push(time);
                }
            }

            const html = times.map(time => `
                <div class="time-slot" onclick="selectTime('${time}', this)">${time}</div>
            `).join('');

            document.getElementById('timeSlots').innerHTML = html;
        }

        function selectTime(time, element) {
            document.querySelectorAll('.time-slot').forEach(el => el.classList.remove('selected'));
            element.classList.add('selected');
            selectedTime = time;
        }

        function updateMeetingDetails() {
            const type = document.getElementById('scheduleType').value;
            const label = document.getElementById('meetingDetailLabel');
            const input = document.getElementById('meetingDetailInput');
            const hint = document.getElementById('meetingDetailHint');

            switch (type) {
                case 'video':
                    label.textContent = 'Video Call Link';
                    input.placeholder = 'Paste your video call link here';
                    input.type = 'text';
                    hint.textContent = 'e.g., Google Meet, Teams, or other video call link';
                    break;
                case 'zoom':
                    label.textContent = 'Zoom Meeting Link';
                    input.placeholder = 'https://zoom.us/j/...';
                    input.type = 'text';
                    hint.textContent = 'Paste your Zoom meeting link or meeting ID';
                    break;
                case 'facetime':
                    label.textContent = 'FaceTime Number or Email';
                    input.placeholder = '+1 (555) 123-4567 or email@icloud.com';
                    input.type = 'text';
                    hint.textContent = 'Phone number or Apple ID for FaceTime';
                    break;
                case 'phone':
                    label.textContent = 'Phone Number';
                    input.placeholder = '+1 (555) 123-4567';
                    input.type = 'tel';
                    hint.textContent = 'Enter the phone number to call';
                    break;
                case 'coffee':
                    label.textContent = 'Meeting Location';
                    input.placeholder = 'e.g., Blue Bottle Coffee, 123 Main St';
                    input.type = 'text';
                    hint.textContent = 'Name and address of the coffee shop or meeting spot';
                    break;
            }
        }

        async function sendMeetingRequest() {
            const date = document.getElementById('scheduleDate').value;
            const time = selectedTime;
            const duration = parseInt(document.getElementById('scheduleDuration').value);
            const topic = document.getElementById('scheduleTopic').value.trim();
            const type = document.getElementById('scheduleType').value;
            const meetingDetail = document.getElementById('meetingDetailInput').value.trim();

            if (!date || !time || !topic) {
                alert('Please fill in all fields');
                return;
            }

            if (!meetingDetail) {
                const detailNames = { video: 'video call link', zoom: 'Zoom link', facetime: 'FaceTime contact', phone: 'phone number', coffee: 'meeting location' };
                alert(`Please enter the ${detailNames[type] || 'meeting details'}`);
                return;
            }

            if (!selectedPerson || !currentUser) return;

            try {
                const startTime = new Date(`${date}T${time}:00`);
                const endTime = new Date(startTime.getTime() + duration * 60000);

                const { data, error } = await supabaseClient
                    .from('meetings')
                    .insert([{
                        organizer_id: currentUser.id,
                        participant_id: selectedPerson.id,
                        title: topic,
                        note: meetingDetail,
                        meeting_type: type,
                        start_time: startTime.toISOString(),
                        end_time: endTime.toISOString(),
                        status: 'pending'
                    }])
                    .select()
                    .single();

                if (error) throw error;

                meetings.push(data);
                showToast(`Meeting request sent to ${selectedPerson.firstName}! ☕`, 'success');
                switchView('dashboardView');
                updateDashboard();
            } catch (err) {
                console.error('sendMeetingRequest:', err);
                showToast('Failed to send request: ' + err.message, 'error');
            }
        }

        // Calling
        function startCall(personName, initials) {
            document.getElementById('callPersonName').textContent = personName;
            document.getElementById('remoteName').textContent = initials;
            document.getElementById('remotePerson').textContent = personName;
            
            callDuration = 0;
            callInterval = setInterval(() => {
                callDuration++;
                const mins = Math.floor(callDuration / 60);
                const secs = callDuration % 60;
                document.getElementById('callTimer').textContent = 
                    `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
            }, 1000);

            switchView('callView');
        }

        function endCall() {
            if (callInterval) clearInterval(callInterval);
            switchView('messagesView');
        }

        function toggleMic() {
            const btn = document.getElementById('micBtn');
            btn.classList.toggle('muted');
        }

        function toggleVideo() {
            const btn = document.getElementById('videoBtn');
            btn.classList.toggle('muted');
        }

        // Modals
        function openModal(modalId) {
            document.getElementById(modalId).classList.add('active');
        }

        function closeModal(modalId) {
            document.getElementById(modalId).classList.remove('active');
        }

        // Profile Management
        function editMyProfile() {
            document.getElementById('avatarInitials').textContent = currentUser.firstName[0] + currentUser.lastName[0];
            document.getElementById('editFirstName').value = currentUser.firstName;
            document.getElementById('editLastName').value = currentUser.lastName;
            document.getElementById('editRole').value = currentUser.role || '';
            document.getElementById('editCompany').value = currentUser.company || '';
            document.getElementById('editLocation').value = currentUser.location || '';
            document.getElementById('editBio').value = currentUser.bio || '';
            document.getElementById('editIndustry').value = currentUser.industry;
            document.getElementById('editInterests').value = (currentUser.interests || []).join(', ');
            document.getElementById('editHobbies').value = (currentUser.hobbies || []).join(', ');
            document.getElementById('editGoals').value = currentUser.goals || '';
            openModal('editProfileModal');
        }

        async function saveProfile() {
            if (!currentUser) return;

            // Get all form values
            const firstName = document.getElementById('editFirstName').value;
            const lastName = document.getElementById('editLastName').value;
            const role = document.getElementById('editRole').value;
            const company = document.getElementById('editCompany').value;
            const location = document.getElementById('editLocation').value;
            const bio = document.getElementById('editBio').value;
            const industry = document.getElementById('editIndustry').value;
            const interests = document.getElementById('editInterests').value.split(',').map(i => i.trim()).filter(Boolean);
            const hobbies = document.getElementById('editHobbies').value.split(',').map(h => h.trim()).filter(Boolean);
            const goals = document.getElementById('editGoals').value;

            try {
                // Update profile in Supabase
                const { error } = await supabaseClient
                    .from('profiles')
                    .update({
                        first_name: firstName,
                        last_name: lastName,
                        role,
                        company,
                        location,
                        bio,
                        industry,
                        interests,
                        hobbies,
                        goals,
                        profile_picture: currentUser.profilePicture || null,
                        resume_url: currentUser.resume || null,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', currentUser.id);

                if (error) throw error;

                // Update local currentUser object
                currentUser.firstName = firstName;
                currentUser.lastName = lastName;
                currentUser.role = role;
                currentUser.company = company;
                currentUser.location = location;
                currentUser.bio = bio;
                currentUser.industry = industry;
                currentUser.interests = interests;
                currentUser.hobbies = hobbies;
                currentUser.goals = goals;

                alert('Profile updated successfully!');
                closeModal('editProfileModal');
                await updateDashboard();
            } catch (error) {
                console.error('Error saving profile:', error);
                alert('Failed to update profile: ' + error.message);
            }
        }

        function handleAvatarUpload(event) {
            const file = event.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = function(e) {
                const img = new Image();
                img.onload = function() {
                    const canvas = document.createElement('canvas');
                    const MAX = 300;
                    let w = img.width, h = img.height;
                    if (w > h) { if (w > MAX) { h = Math.round(h * MAX / w); w = MAX; } }
                    else       { if (h > MAX) { w = Math.round(w * MAX / h); h = MAX; } }
                    canvas.width = w; canvas.height = h;
                    canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                    const compressed = canvas.toDataURL('image/jpeg', 0.82);
                    currentUser.profilePicture = compressed;
                    document.getElementById('avatarPreview').innerHTML = `<img src="${compressed}" alt="Profile Picture">`;
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        }

        async function openResume(urlOrPath) {
            if (!urlOrPath) return;
            if (urlOrPath.startsWith('data:')) {
                // Legacy base64 data URL
                try {
                    const parts = urlOrPath.split(',');
                    const mime = parts[0].split(':')[1].split(';')[0];
                    const binary = atob(parts[1]);
                    const arr = new Uint8Array(binary.length);
                    for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
                    const blob = new Blob([arr], { type: mime });
                    window.open(URL.createObjectURL(blob), '_blank');
                } catch (e) { alert('Could not open resume.'); }
            } else if (urlOrPath.startsWith('http')) {
                window.open(urlOrPath, '_blank');
            } else {
                // Storage path — generate 1-hour signed URL (resumes bucket is private)
                try {
                    const { data, error } = await supabaseClient.storage.from('resumes').createSignedUrl(urlOrPath, 3600);
                    if (error) throw error;
                    window.open(data.signedUrl, '_blank');
                } catch (e) { showToast('Could not open resume: ' + e.message, 'error'); }
            }
        }

        function handleResumeUpload(event) {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    currentUser.resume = e.target.result;
                    document.getElementById('resumePreview').innerHTML = `
                        <div style="margin-top: 1rem; padding: 1rem; background: #d4edda; border-radius: 8px; color: #155724; font-size: 14px;">
                            ✓ Resume uploaded successfully
                        </div>
                    `;
                };
                reader.readAsDataURL(file);
            }
        }

        // Posts
        function createPost() {
            openModal('createPostModal');
        }

        async function publishPost() {
            if (!currentUser) {
                alert('Please log in to create a post');
                return;
            }

            const content = document.getElementById('postContent').value.trim();
            if (!content) {
                alert('Please write something!');
                return;
            }

            try {
                const { data, error } = await supabaseClient
                    .from('posts')
                    .insert([{
                        author_id: currentUser.id,
                        content
                    }])
                    .select()
                    .single();

                if (error) throw error;

                // Add to local posts array
                posts.unshift({
                    ...data,
                    author: `${currentUser.firstName} ${currentUser.lastName}`,
                    date: 'Just now'
                });

                document.getElementById('postContent').value = '';
                closeModal('createPostModal');
                alert('Post published successfully!');

                // Refresh feed if we're on it
                if (document.getElementById('feedView').classList.contains('active')) {
                    await renderFeed();
                }
            } catch (error) {
                console.error('Error publishing post:', error);
                alert('Failed to publish post: ' + error.message);
            }
        }

        async function likePost(postId, btn) {
            if (!currentUser) return;
            if (!btn) btn = document.getElementById(`cflike-${postId}`) || document.getElementById(`gflike-${postId}`);
            const countEl = document.getElementById(`cflikecount-${postId}`) || document.getElementById(`gflikecount-${postId}`);
            const isLiked = btn && btn.classList.contains('liked');

            // Optimistic update
            if (btn) {
                btn.classList.toggle('liked', !isLiked);
                btn.style.color      = !isLiked ? 'var(--primary)' : '';
                btn.style.fontWeight = !isLiked ? '700' : '';
            }
            if (countEl) {
                const cur = parseInt(countEl.textContent) || 0;
                countEl.textContent = isLiked ? Math.max(0, cur - 1) : cur + 1;
            }

            try {
                const { data: existing } = await supabaseClient
                    .from('post_likes')
                    .select('id')
                    .eq('post_id', postId)
                    .eq('user_id', currentUser.id)
                    .maybeSingle();

                if (existing) {
                    await supabaseClient.from('post_likes').delete().eq('id', existing.id);
                } else {
                    await supabaseClient.from('post_likes').insert([{ post_id: postId, user_id: currentUser.id }]);
                }
            } catch (error) {
                // Revert optimistic update on failure
                if (btn) {
                    btn.classList.toggle('liked', isLiked);
                    btn.style.color      = isLiked ? 'var(--primary)' : '';
                    btn.style.fontWeight = isLiked ? '700' : '';
                }
                if (countEl) {
                    const cur = parseInt(countEl.textContent) || 0;
                    countEl.textContent = isLiked ? cur + 1 : Math.max(0, cur - 1);
                }
                console.error('Error liking post:', error);
            }
        }

        function toggleComments(postId) {
            const section = document.getElementById(`comments-${postId}`);
            if (!section) return;
            if (section.style.display === 'none') {
                section.style.display = 'block';
                loadComments(postId);
            } else {
                section.style.display = 'none';
            }
        }

        // Store mock comments locally
        const mockComments = {};

        async function loadComments(postId) {
            const container = document.getElementById(`comments-list-${postId}`);
            if (!container) return;

            // Handle mock posts locally
            if (String(postId).startsWith('mock-')) {
                const comments = mockComments[postId] || [];
                container.innerHTML = comments.map(c => `
                    <div style="padding: 0.5rem 0; border-bottom: 1px solid var(--border); font-size: 13px;">
                        <strong>${c.author}</strong>
                        <p style="margin: 0.25rem 0;">${c.content}</p>
                    </div>
                `).join('') || '<p style="font-size: 13px; color: #999;">No comments yet. Be the first!</p>';
                return;
            }

            try {
                const { data: comments, error } = await supabaseClient
                    .from('post_comments')
                    .select('*, profiles(first_name, last_name)')
                    .eq('post_id', postId)
                    .order('created_at', { ascending: true });

                if (error) throw error;

                container.innerHTML = (comments || []).map(c => `
                    <div style="padding: 0.5rem 0; border-bottom: 1px solid var(--border); font-size: 13px;">
                        <strong>${c.profiles.first_name} ${c.profiles.last_name}</strong>
                        <p style="margin: 0.25rem 0;">${c.content}</p>
                    </div>
                `).join('') || '<p style="font-size: 13px; color: #999;">No comments yet. Be the first!</p>';
            } catch (error) {
                console.error('Error loading comments:', error);
            }
        }

        async function submitComment(postId) {
            if (!currentUser) return;
            const input = document.getElementById(`comment-input-${postId}`);
            const text = input.value.trim();
            if (!text) return;

            // Handle mock posts locally
            if (String(postId).startsWith('mock-')) {
                if (!mockComments[postId]) mockComments[postId] = [];
                mockComments[postId].push({
                    author: `${currentUser.firstName} ${currentUser.lastName}`,
                    content: text
                });
                input.value = '';
                await loadComments(postId);
                return;
            }

            try {
                const { error } = await supabaseClient
                    .from('post_comments')
                    .insert([{ post_id: postId, user_id: currentUser.id, content: text }]);

                if (error) throw error;
                input.value = '';
                await loadComments(postId);
            } catch (error) {
                console.error('Error posting comment:', error);
                alert('Failed to post comment: ' + error.message);
            }
        }

        function sharePost(postId) {
            const post = posts.find(p => String(p.id) === String(postId));
            if (!post) return;

            if (navigator.share) {
                navigator.share({
                    title: 'First Sip Post',
                    text: post.content.substring(0, 100),
                    url: window.location.href
                }).catch(() => {});
            } else {
                navigator.clipboard.writeText(post.content).then(() => {
                    alert('Post content copied to clipboard!');
                }).catch(() => {
                    alert('Unable to share.');
                });
            }
        }

        // ===== FEED FUNCTIONS =====
        let activeFeedTab = 'connections';

        function switchFeedTab(tab) {
            activeFeedTab = tab;
            document.getElementById('feedTabConnections').classList.toggle('active', tab === 'connections');
            document.getElementById('feedTabGroups').classList.toggle('active', tab === 'groups');
            renderFeed();
        }

        async function renderFeed() {
            const feedPosts = document.getElementById('feedPosts');

            if (activeFeedTab === 'groups') {
                await renderGroupsFeedTab(feedPosts);
                return;
            }

            // --- Connections feed (Supabase-backed) ---
            const connectedIds = new Set();
            connections.forEach(c => {
                if (c.user_id === currentUser.id) connectedIds.add(c.connected_user_id);
                if (c.connected_user_id === currentUser.id) connectedIds.add(c.user_id);
            });

            if (connectedIds.size === 0) {
                feedPosts.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">🤝</div>
                        <p>Connect with people to see their posts here!</p>
                        <button class="btn btn-primary" onclick="switchView('discoverView')" style="margin-top:1rem;">Discover People</button>
                    </div>`;
                return;
            }

            try {
                const idList = Array.from(connectedIds);

                // Fetch posts + author profiles in one query
                const { data: feedItems, error } = await supabaseClient
                    .from('posts')
                    .select('*, profiles!posts_author_id_fkey(id, first_name, last_name, profile_picture)')
                    .in('author_id', idList)
                    .is('group_id', null)
                    .order('created_at', { ascending: false })
                    .limit(50);

                if (error) throw error;

                if (!feedItems || feedItems.length === 0) {
                    feedPosts.innerHTML = `
                        <div class="empty-state">
                            <div class="empty-state-icon">✍️</div>
                            <p>No posts yet from your connections — check back soon!</p>
                        </div>`;
                    return;
                }

                // Fetch which posts current user has already liked
                const postIds = feedItems.map(p => p.id);
                const { data: myLikes } = await supabaseClient
                    .from('post_likes')
                    .select('post_id')
                    .eq('user_id', currentUser.id)
                    .in('post_id', postIds);
                const likedSet = new Set((myLikes || []).map(l => l.post_id));

                // Fetch live like counts
                const { data: likeCounts } = await supabaseClient
                    .from('post_likes')
                    .select('post_id')
                    .in('post_id', postIds);
                const likeCountMap = {};
                (likeCounts || []).forEach(l => {
                    likeCountMap[l.post_id] = (likeCountMap[l.post_id] || 0) + 1;
                });

                feedPosts.innerHTML = feedItems.map(post => {
                    const p = post.profiles || {};
                    const authorName = p.first_name ? `${p.first_name} ${p.last_name}` : 'Member';
                    const authorId   = p.id || post.author_id;
                    const avatarContent = p.profile_picture
                        ? `<img src="${p.profile_picture}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`
                        : p.first_name ? `${p.first_name[0]}${(p.last_name||'')[0]}` : '?';
                    const liked    = likedSet.has(post.id);
                    const likeCount = likeCountMap[post.id] || 0;
                    const timeAgo  = post.created_at ? getTimeAgo(post.created_at) : 'Recently';
                    return `
                        <div class="post-card">
                            <div class="post-header">
                                <div style="display:flex;align-items:center;gap:1rem;cursor:pointer;" onclick="viewProfile('${authorId}')">
                                    <div class="person-avatar" style="width:48px;height:48px;font-size:20px;">${avatarContent}</div>
                                    <div><strong>${authorName}</strong><p class="post-meta">${timeAgo}</p></div>
                                </div>
                            </div>
                            <div class="post-content">${post.content}</div>
                            <div class="post-actions">
                                <button class="post-action-btn${liked ? ' liked' : ''}" id="cflike-${post.id}" onclick="likePost('${post.id}', this)" style="${liked ? 'color:var(--primary);font-weight:700;' : ''}">👍 <span id="cflikecount-${post.id}">${likeCount}</span> ${likeCount === 1 ? 'Like' : 'Likes'}</button>
                                <button class="post-action-btn" onclick="toggleComments('${post.id}')">💬 Comment</button>
                                <button class="post-action-btn" onclick="sharePost('${post.id}')">🔄 Share</button>
                            </div>
                            <div id="comments-${post.id}" style="display:none;margin-top:1rem;padding-top:1rem;border-top:1px solid var(--border);">
                                <div id="comments-list-${post.id}" style="margin-bottom:0.75rem;"></div>
                                <div style="display:flex;gap:0.5rem;">
                                    <input type="text" id="comment-input-${post.id}" placeholder="Write a comment..." style="flex:1;padding:8px;border-radius:8px;border:1px solid var(--border);" onkeypress="if(event.key==='Enter') submitComment('${post.id}')">
                                    <button class="btn btn-primary btn-sm" onclick="submitComment('${post.id}')">Post</button>
                                </div>
                            </div>
                        </div>`;
                }).join('');

            } catch (err) {
                console.error('renderFeed error:', err);
                feedPosts.innerHTML = '<div class="empty-state"><p>Failed to load feed. Please try again.</p></div>';
            }
        }

        async function renderGroupsFeedTab(container) {
            if (myGroupIds.size === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">👥</div>
                        <p>Join a group to see posts from your communities here!</p>
                        <button class="btn btn-primary" onclick="switchView('groupsView')" style="margin-top:1rem;">Browse Communities</button>
                    </div>`;
                return;
            }

            try {
                const groupIdsList = Array.from(myGroupIds);
                const { data: postsData, error } = await supabaseClient
                    .from('posts')
                    .select('*, profiles!posts_author_id_fkey(id, first_name, last_name), groups!posts_group_id_fkey(name)')
                    .in('group_id', groupIdsList)
                    .order('created_at', { ascending: false })
                    .limit(50);

                if (error) throw error;

                if (!postsData || postsData.length === 0) {
                    container.innerHTML = `
                        <div class="empty-state">
                            <div class="empty-state-icon">✍️</div>
                            <p>No posts in your groups yet — be the first to share something!</p>
                        </div>`;
                    return;
                }

                container.innerHTML = postsData.map(post => {
                    const authorName = post.profiles ? `${post.profiles.first_name} ${post.profiles.last_name}` : 'Member';
                    const groupName = post.groups ? post.groups.name : '';
                    const timeAgo = post.created_at ? getTimeAgo(post.created_at) : 'Recently';
                    const authorId = post.profiles ? post.profiles.id : null;
                    return `
                        <div class="post-card">
                            <div class="post-header">
                                <div style="display:flex;align-items:center;gap:1rem;" ${authorId ? `onclick="viewProfile('${authorId}')" style="cursor:pointer;"` : ''}>
                                    <div class="person-avatar" style="width:48px;height:48px;font-size:20px;">${authorName[0]}</div>
                                    <div>
                                        <strong>${authorName}</strong>
                                        <p class="post-meta">${timeAgo} · <span style="color:var(--primary);font-weight:600;">${groupName}</span></p>
                                    </div>
                                </div>
                            </div>
                            <div class="post-content">${post.content}</div>
                            <div class="post-actions">
                                <button class="post-action-btn" id="gflike-${post.id}" onclick="likeFeedGroupPost('${post.id}', this)">👍 <span id="gflikecount-${post.id}">${post.likes_count || 0}</span> Likes</button>
                                <button class="post-action-btn" onclick="toggleFeedGroupComments('${post.id}')">💬 Comment</button>
                            </div>
                            <div id="gfcomments-${post.id}" style="display:none;margin-top:1rem;padding-top:1rem;border-top:1px solid var(--border);">
                                <div id="gfcomments-list-${post.id}" style="margin-bottom:0.75rem;"></div>
                                <div style="display:flex;gap:0.5rem;">
                                    <input type="text" id="gfcomment-input-${post.id}" placeholder="Write a comment..." style="flex:1;padding:8px;border-radius:8px;border:1px solid var(--border);" onkeypress="if(event.key==='Enter') submitFeedGroupComment('${post.id}')">
                                    <button class="btn btn-primary btn-sm" onclick="submitFeedGroupComment('${post.id}')">Post</button>
                                </div>
                            </div>
                        </div>`;
                }).join('');
            } catch (err) {
                console.error('Error loading group feed:', err);
                container.innerHTML = '<div class="empty-state"><p>Failed to load group posts.</p></div>';
            }
        }

        async function likeFeedGroupPost(postId, btn) {
            await likePost(postId, btn);
        }

        function toggleFeedGroupComments(postId) {
            const el = document.getElementById(`gfcomments-${postId}`);
            if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
        }

        async function submitFeedGroupComment(postId) {
            if (!currentUser) return;
            const input = document.getElementById(`gfcomment-input-${postId}`);
            if (!input || !input.value.trim()) return;
            const text = input.value.trim();

            try {
                const { error } = await supabaseClient
                    .from('post_comments')
                    .insert([{ post_id: postId, user_id: currentUser.id, content: text }]);

                if (error) throw error;

                const listEl = document.getElementById(`gfcomments-list-${postId}`);
                if (listEl) {
                    listEl.innerHTML += `
                        <div style="background:var(--bg-light);border-radius:8px;padding:8px 12px;margin-bottom:6px;font-size:13px;">
                            <strong>${currentUser.firstName}:</strong> ${text}
                        </div>`;
                }
                input.value = '';
            } catch (err) {
                console.error('Error posting comment:', err);
            }
        }

        // ===== SMART RECOMMENDATIONS =====
        function getSmartRecommendations() {
            if (!currentUser) return [];

            const userInterests = currentUser.interests || [];
            const userHobbies = currentUser.hobbies || [];
            const userIndustry = currentUser.industry;

            return users.filter(u => {
                if (u.id === currentUser.id) return false;
                const isConnected = connections.find(c =>
                    (c.user_id === currentUser.id && c.connected_user_id === u.id) ||
                    (c.connected_user_id === currentUser.id && c.user_id === u.id));
                return !isConnected;
            }).map(user => {
                let score = 0;
                const reasons = [];

                // Field of study match (highest priority)
                if (user.industry === userIndustry) {
                    score += 50;
                    reasons.push(`Same field: ${userIndustry}`);
                }

                // Interests match
                const commonInterests = userInterests.filter(interest =>
                    user.interests && user.interests.includes(interest)
                );
                if (commonInterests.length > 0) {
                    score += commonInterests.length * 20;
                    reasons.push(`Shared interests: ${commonInterests.join(', ')}`);
                }

                // Hobbies match
                if (user.hobbies && userHobbies.length > 0) {
                    const commonHobbies = userHobbies.filter(hobby =>
                        user.hobbies.includes(hobby)
                    );
                    if (commonHobbies.length > 0) {
                        score += commonHobbies.length * 15;
                        reasons.push(`Shared hobbies: ${commonHobbies.join(', ')}`);
                    }
                }

                // Graduation year match
                if (user.location && currentUser.location && user.location === currentUser.location) {
                    score += 10;
                    reasons.push(`Same class: ${user.location}`);
                }

                // School match
                if (user.company && currentUser.company && user.company.toLowerCase() === currentUser.company.toLowerCase()) {
                    score += 25;
                    reasons.push(`Same school: ${user.company}`);
                }

                // Career goals keyword match
                if (user.goals && currentUser.goals) {
                    const userGoalWords = currentUser.goals.toLowerCase().split(/\s+/).filter(w => w.length > 3);
                    const theirGoalWords = user.goals.toLowerCase().split(/\s+/).filter(w => w.length > 3);
                    const commonGoalWords = userGoalWords.filter(word => theirGoalWords.includes(word));
                    if (commonGoalWords.length > 0) {
                        score += Math.min(commonGoalWords.length * 10, 30);
                        reasons.push('Aligned career goals');
                    }
                }

                // Mentorship potential (upperclassmen/alumni mentoring underclassmen)
                if (user.role && currentUser.role && user.industry === userIndustry) {
                    const seniorKeywords = ['senior', 'recent grad', 'junior', 'lead', 'head', 'director', 'vp', 'chief', 'principal', 'staff', 'manager'];
                    const userIsSenior = seniorKeywords.some(k => currentUser.role.toLowerCase().includes(k));
                    const theyAreSenior = seniorKeywords.some(k => user.role.toLowerCase().includes(k));
                    if (userIsSenior !== theyAreSenior) {
                        score += 15;
                        reasons.push('Mentorship potential');
                    }
                }

                return {
                    user,
                    score,
                    reasons
                };
            })
            .sort((a, b) => b.score - a.score); // Sort by score descending; show all
        }

        function renderRecommendations() {
            const recommendations = getSmartRecommendations();

            if (recommendations.length === 0) return '';

            return `
                <div style="margin-bottom: 2rem;">
                    <h2 style="margin-bottom: 1rem;">✨ Recommended For You</h2>
                    <div class="grid">
                        ${recommendations.slice(0, 3).map(item => {
                            const user = item.user;
                            const fn = user.firstName || '?';
                            const ln = user.lastName || '?';
                            const isConnected = connections.find(c =>
                                (c.user_id === currentUser.id && c.connected_user_id === user.id) ||
                                (c.connected_user_id === currentUser.id && c.user_id === user.id));
                            const isPending = sentRequests.find(c => c.connected_user_id === user.id);
                            const hasRequestedMe = pendingRequests.find(c => (c.sender_id || c.user_id) === user.id);
                            const avatarContent = user.profilePicture
                                ? `<img src="${user.profilePicture}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`
                                : `${fn[0]}${ln[0]}`;

                            let recActionBtn;
                            if (isConnected) {
                                recActionBtn = `<button class="btn btn-secondary btn-sm" onclick="startMessage('${user.id}')" style="flex: 1;">Message</button>`;
                            } else if (hasRequestedMe) {
                                recActionBtn = `<button class="btn btn-accent btn-sm" onclick="acceptConnection('${hasRequestedMe.id}')" style="flex: 1;">Accept Request</button>`;
                            } else if (isPending) {
                                recActionBtn = `<button class="btn btn-secondary btn-sm" disabled style="flex: 1; opacity: 0.6;">Request Sent</button>`;
                            } else {
                                recActionBtn = `<button class="btn btn-accent btn-sm" onclick="connectUser('${user.id}')" style="flex: 1;">Connect</button>`;
                            }

                            return `
                                <div class="card person-card">
                                    <div style="background: linear-gradient(135deg, var(--accent), var(--primary)); padding: 0.5rem; border-radius: 8px; margin-bottom: 1rem;">
                                        <p style="font-size: 11px; color: white; margin: 0; text-align: center;">${item.score > 0 ? `⭐ ${item.score}% Match` : '👋 New Member'}</p>
                                    </div>
                                    <div class="person-avatar" style="width: 70px; height: 70px; font-size: 28px; margin: 0 auto 1rem;">${avatarContent}</div>
                                    <h3>${fn} ${ln}</h3>
                                    <p class="role">${user.role || user.industry || ''}</p>
                                    <div style="text-align: left; margin: 1rem 0; padding: 0.75rem; background: var(--bg-light); border-radius: 8px;">
                                        <p style="font-size: 11px; color: var(--primary); font-weight: 600; margin-bottom: 0.5rem;">Why we suggest ${fn}:</p>
                                        ${item.reasons.map(reason => `<p style="font-size: 11px; color: #666; margin: 0.25rem 0;">• ${reason}</p>`).join('')}
                                    </div>
                                    <div class="profile-actions">
                                        <button class="btn btn-primary btn-sm" onclick="viewProfile('${user.id}')" style="flex: 1;">View Profile</button>
                                        ${recActionBtn}
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
        }

        // (Recommendations and hobbies integrated into original functions above)

        // ===== AVAILABILITY FUNCTIONS =====
        async function renderAvailability() {
            if (!currentUser) return;

            try {
                const { data: availability, error } = await supabaseClient
                    .from('availability')
                    .select('*')
                    .eq('user_id', currentUser.id)
                    .order('day_of_week', { ascending: true })
                    .order('start_time', { ascending: true });

                if (error) throw error;

                const container = document.getElementById('availabilitySlots');

                if (!availability || availability.length === 0) {
                    container.innerHTML = `
                        <div class="empty-state">
                            <p>No availability set. Add your available times below.</p>
                        </div>
                    `;
                    return;
                }

                const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

                container.innerHTML = availability.map(slot => `
                    <div class="meeting-card" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                        <div>
                            <strong>${days[slot.day_of_week]}</strong>
                            <p style="font-size: 14px; color: #666; margin: 0.25rem 0;">
                                ${slot.start_time} - ${slot.end_time}
                            </p>
                        </div>
                        <button class="btn btn-danger btn-sm" onclick="deleteAvailabilitySlot('${slot.id}')">Delete</button>
                    </div>
                `).join('');
            } catch (error) {
                console.error('Error rendering availability:', error);
            }
        }

        async function addAvailabilitySlot() {
            if (!currentUser) {
                alert('Please log in');
                return;
            }

            const day = document.getElementById('availabilityDay').value;
            const startTime = document.getElementById('availabilityStartTime').value;
            const endTime = document.getElementById('availabilityEndTime').value;

            if (!startTime || !endTime) {
                alert('Please select start and end times');
                return;
            }

            if (startTime >= endTime) {
                alert('End time must be after start time');
                return;
            }

            try {
                const { error } = await supabaseClient
                    .from('availability')
                    .insert([{
                        user_id: currentUser.id,
                        day_of_week: parseInt(day),
                        start_time: startTime,
                        end_time: endTime,
                        is_available: true
                    }]);

                if (error) throw error;

                await renderAvailability();
                alert('Availability added!');
            } catch (error) {
                console.error('Error adding availability:', error);
                alert('Failed to add availability: ' + error.message);
            }
        }

        async function deleteAvailabilitySlot(slotId) {
            if (!currentUser) return;

            if (!confirm('Delete this availability slot?')) return;

            try {
                const { error } = await supabaseClient
                    .from('availability')
                    .delete()
                    .eq('id', slotId);

                if (error) throw error;

                await renderAvailability();
                alert('Availability deleted');
            } catch (error) {
                console.error('Error deleting availability:', error);
                alert('Failed to delete availability: ' + error.message);
            }
        }

        // ============================================
        // MY PROFILE (LinkedIn-style)
        // ============================================

        async function renderMyProfile() {
            if (!currentUser) return;
            const container = document.getElementById('myProfileContent');
            if (!container) return;

            // Fetch fresh profile from Supabase
            let profile = { ...currentUser };
            try {
                const { data: profileData } = await supabaseClient.from('profiles').select('*').eq('id', currentUser.id).single();
                if (profileData) {
                    profile = {
                        ...currentUser,
                        firstName:      profileData.first_name    || currentUser.firstName,
                        lastName:       profileData.last_name     || currentUser.lastName,
                        headline:       profileData.headline      ?? currentUser.headline,
                        bio:            profileData.bio           ?? currentUser.bio,
                        interests:      Array.isArray(profileData.interests) ? profileData.interests : (currentUser.interests || []),
                        hobbies:        Array.isArray(profileData.hobbies)   ? profileData.hobbies   : (currentUser.hobbies   || []),
                        goals:          profileData.goals         ?? currentUser.goals,
                        location:       profileData.location      ?? currentUser.location,
                        linkedinUrl:    profileData.linkedin_url  ?? currentUser.linkedinUrl,
                        profilePicture: profileData.profile_picture ?? currentUser.profilePicture,
                        bannerImage:    profileData.banner_image  ?? currentUser.bannerImage ?? null,
                        resume:         profileData.resume_url    ?? currentUser.resume,
                        avatarColor:    profileData.avatar_color  || null,
                        major:          profileData.major         ?? currentUser.major,
                        industry:       profileData.industry      ?? currentUser.industry,
                        role:           profileData.role          ?? currentUser.role,
                        company:        profileData.company       ?? currentUser.company,
                        gradYear:       profileData.grad_year     ?? currentUser.gradYear,
                        isOnline:       profileData.is_online,
                        chatOpen:       profileData.chat_open,
                    };
                }
            } catch(e) { console.error('renderMyProfile fetch profile:', e); }

            // Use profile_completeness RPC for accurate percentage
            let percentage = getProfileCompletion().percentage;
            try {
                const { data: pctData } = await supabaseClient.rpc('profile_completeness', { profile_id: currentUser.id });
                if (pctData !== null && pctData !== undefined) percentage = pctData;
            } catch(e) { console.error('profile_completeness RPC:', e); }

            const now = new Date();
            const chatsCompleted = meetings.filter(m => new Date(m.date || m.start_time) < now).length;
            const upcomingCount  = meetings.filter(m => new Date(m.date || m.start_time) >= now).length;

            const initials = `${(profile.firstName || '?')[0]}${(profile.lastName || '?')[0]}`.toUpperCase();
            const avatarBg = profile.profilePicture ? 'none'
                : (profile.avatarColor || 'linear-gradient(135deg,var(--caramel),var(--espresso))');
            const avatarInner = profile.profilePicture
                ? `<img src="${profile.profilePicture}" alt="${profile.firstName}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`
                : initials;

            // Fetch availability
            let availRows = [];
            try {
                const { data } = await supabaseClient
                    .from('availability')
                    .select('*')
                    .eq('user_id', currentUser.id)
                    .order('day_of_week');
                availRows = (data || []).filter(r => r.is_available);
            } catch(e) {}

            // Build availability rows HTML
            const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
            const fmt = t => {
                if (!t) return '';
                const [h, m] = t.split(':');
                const hr = parseInt(h);
                return `${hr > 12 ? hr - 12 : (hr === 0 ? 12 : hr)}:${m} ${hr >= 12 ? 'PM' : 'AM'}`;
            };
            const openDaysHtml = availRows.map(r => `
                <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--latte-soft);font-size:13px;">
                    <span style="font-weight:600;width:36px;color:var(--brown);">${dayNames[r.day_of_week]}</span>
                    <span style="color:var(--muted);font-size:12.5px;">${fmt(r.start_time)} – ${fmt(r.end_time)}</span>
                    <span style="font-size:11px;font-weight:700;padding:2px 8px;border-radius:99px;background:#eaf4ee;color:#2d6a4f;">Open</span>
                </div>`).join('');
            const openDayNums = new Set(availRows.map(r => r.day_of_week));
            const closedHtml  = [0,1,2,3,4,5,6].filter(d => !openDayNums.has(d)).slice(0, 2).map(d => `
                <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--latte-soft);font-size:13px;">
                    <span style="font-weight:600;width:36px;color:var(--brown);">${dayNames[d]}</span>
                    <span style="color:var(--muted);font-size:12.5px;">—</span>
                    <span style="font-size:11px;font-weight:600;padding:2px 8px;border-radius:99px;background:var(--latte-soft);color:var(--muted);">Closed</span>
                </div>`).join('');

            // Fetch own achievements
            let _myAchs = [];
            try {
                const { data: myAchData } = await supabaseClient
                    .from('achievements')
                    .select('*')
                    .eq('user_id', currentUser.id)
                    .order('display_order');
                _myAchs = myAchData || [];
            } catch(e) { console.error('renderMyProfile achievements:', e); }

            // Fetch own posts
            let _myPosts = [];
            let _myPostLikeMap = {};
            let _myPostLikedSet = new Set();
            try {
                const { data: myPostData } = await supabaseClient
                    .from('posts')
                    .select('*')
                    .eq('author_id', currentUser.id)
                    .is('group_id', null)
                    .order('created_at', { ascending: false });
                _myPosts = myPostData || [];
                if (_myPosts.length > 0) {
                    const { data: myLikes } = await supabaseClient
                        .from('post_likes')
                        .select('post_id, user_id')
                        .in('post_id', _myPosts.map(p => p.id));
                    (myLikes || []).forEach(l => {
                        _myPostLikeMap[l.post_id] = (_myPostLikeMap[l.post_id] || 0) + 1;
                        if (l.user_id === currentUser.id) _myPostLikedSet.add(l.post_id);
                    });
                }
            } catch(e) { console.error('renderMyProfile posts:', e); }

            // Interests + hobbies tags
            const allTags = [...(profile.interests || []), ...(profile.hobbies || [])];
            const tagsHtml = allTags.length
                ? allTags.map(t => `<span style="background:var(--latte-soft);border:1px solid var(--latte);color:var(--brown);border-radius:8px;padding:5px 12px;font-size:12.5px;font-weight:500;">${t}</span>`).join('')
                : `<span style="font-size:13px;color:var(--muted);font-style:italic;">No interests added yet. <span onclick="editMyProfile()" style="color:var(--caramel);cursor:pointer;font-style:normal;font-weight:600;">Add some →</span></span>`;

            // Completion checklist
            const compItems = [
                { label: 'Photo uploaded',   done: !!profile.profilePicture },
                { label: 'Bio written',      done: !!(profile.bio && profile.bio.trim()) },
                { label: 'Interests added',  done: !!(profile.interests && profile.interests.length > 0) },
                { label: 'Availability set', done: availRows.length > 0 },
                { label: 'LinkedIn URL',     done: !!(profile.linkedinUrl && profile.linkedinUrl.trim()) },
                { label: 'Resume uploaded',  done: !!profile.resume },
                { label: 'Career goals',     done: !!(profile.goals && profile.goals.trim()) },
            ];

            // Hero chips
            const chips = [
                profile.company  ? `🎓 ${profile.company}`                         : null,
                profile.gradYear ? `📅 Class of ${profile.gradYear}`               : null,
                (profile.major || profile.industry) ? `💼 ${profile.major || profile.industry}` : null,
            ].filter(Boolean);

            // Cache data for preview modal
            _myProfilePreviewData = { profile, availRows, tagsHtml, chips };

            container.innerHTML = `
                <style>
                    @keyframes mpFillBar { from { width:0% } to { width:${percentage}%; } }
                    .mp2-btn  { transition: transform .18s, box-shadow .18s; }
                    .mp2-btn:hover  { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(28,18,8,.22) !important; }
                    .mp2-ghost { transition: border-color .15s, color .15s; }
                    .mp2-ghost:hover { border-color: var(--caramel) !important; color: var(--caramel) !important; }
                    .mp2-card  { transition: box-shadow .15s; }
                    .mp2-card:hover  { box-shadow: 0 6px 28px rgba(107,63,42,.14) !important; }
                    .mp2-stat:hover  { background: var(--latte-soft) !important; }
                    .mp2-resume:hover { border-color: var(--caramel) !important; background: #fef3e2 !important; }
                    @media (max-width: 720px) {
                        .mp2-lower { grid-template-columns: 1fr !important; }
                        .mp2-stats { flex-wrap: wrap; }
                        .mp2-stats > div { min-width: 33%; }
                    }
                </style>

                <!-- Page header -->
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;flex-wrap:wrap;gap:12px;">
                    <div>
                        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.9px;color:var(--muted);margin-bottom:4px;">Your presence on First Sip</div>
                        <h1 style="font-family:'Playfair Display',serif;font-size:26px;font-weight:700;color:var(--espresso);line-height:1.2;">My <em style="font-style:italic;color:var(--caramel);">Profile</em></h1>
                    </div>
                    <div style="display:flex;gap:8px;">
                        <button class="mp2-ghost" onclick="showProfilePreview()" style="background:transparent;border:1.5px solid var(--latte);border-radius:10px;padding:9px 16px;font-size:13px;font-weight:500;color:var(--muted);cursor:pointer;font-family:'DM Sans',sans-serif;">👁 Preview</button>
                        <button class="mp2-btn" onclick="editMyProfile()" style="padding:10px 20px;background:var(--espresso);color:var(--cream);border:none;border-radius:10px;font-size:13.5px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;box-shadow:0 3px 12px rgba(28,18,8,.2);">✏️ Edit Profile</button>
                    </div>
                </div>

                <!-- HERO CARD -->
                <div class="mp2-card" style="background:var(--card);border:1px solid var(--latte);border-radius:14px;box-shadow:0 2px 12px rgba(107,63,42,.09);overflow:hidden;margin-bottom:20px;">
                    <div style="height:96px;background:${profile.bannerImage ? `url('${profile.bannerImage}') center/cover no-repeat` : 'linear-gradient(135deg,var(--espresso) 0%,var(--caramel) 60%,#e8c49a 100%)'};position:relative;">
                        ${!profile.bannerImage ? `<div style="position:absolute;inset:0;opacity:.12;background-image:radial-gradient(circle at 20% 50%,#fff 1px,transparent 1px),radial-gradient(circle at 80% 30%,#fff 1px,transparent 1px),radial-gradient(circle at 50% 80%,#fff 1px,transparent 1px);background-size:40px 40px;"></div>` : ''}
                    </div>
                    <div style="padding:0 28px 0;position:relative;">
                        <div style="display:inline-block;margin-top:-36px;margin-bottom:12px;position:relative;">
                            <div onclick="editMyProfile()" style="width:72px;height:72px;border-radius:50%;background:${avatarBg};display:flex;align-items:center;justify-content:center;font-family:'Playfair Display',serif;font-size:26px;font-weight:700;color:#fff;border:3px solid var(--card);box-shadow:0 2px 10px rgba(107,63,42,.22);cursor:pointer;overflow:hidden;position:relative;"
                                onmouseover="this.querySelector('.av-ov').style.opacity=1"
                                onmouseout="this.querySelector('.av-ov').style.opacity=0">
                                ${avatarInner}
                                <div class="av-ov" style="position:absolute;inset:0;border-radius:50%;background:rgba(107,63,42,.5);display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .2s;font-size:18px;color:#fff;">📷</div>
                            </div>
                            <div style="width:14px;height:14px;background:#4caf50;border:2.5px solid var(--card);border-radius:50%;position:absolute;bottom:3px;right:3px;"></div>
                        </div>
                        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap;padding-bottom:20px;">
                            <div>
                                <div style="font-family:'Playfair Display',serif;font-size:22px;color:var(--espresso);line-height:1.2;margin-bottom:3px;">${profile.firstName} ${profile.lastName}</div>
                                <div style="font-size:13.5px;color:var(--brown);font-weight:500;margin-bottom:8px;">${profile.headline || [profile.role, profile.industry].filter(Boolean).join(' · ') || 'Add a headline in Settings'}</div>
                                <div style="display:flex;flex-wrap:wrap;gap:6px;">
                                    ${chips.map(c => `<span style="display:inline-flex;align-items:center;gap:4px;background:var(--latte-soft);border:1px solid var(--latte);border-radius:99px;padding:3px 10px;font-size:12px;color:var(--brown);font-weight:500;">${c}</span>`).join('')}
                                    <span style="display:inline-flex;align-items:center;gap:4px;background:#eaf4ee;border:1px solid #b7dfc9;border-radius:99px;padding:3px 10px;font-size:12px;color:#2d6a4f;font-weight:500;">🟢 Open to chats</span>
                                </div>
                                ${profile.linkedinUrl
                                    ? `<a href="${/^https?:\/\//i.test(profile.linkedinUrl) ? profile.linkedinUrl : 'https://' + profile.linkedinUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-flex;align-items:center;gap:7px;margin-top:10px;padding:6px 13px;background:#f0f4ff;border:1px solid #c0cff5;border-radius:8px;font-size:13px;font-weight:500;color:#2563eb;text-decoration:none;transition:background .15s;" onmouseover="this.style.background='#e0ebff'" onmouseout="this.style.background='#f0f4ff'"><svg width="14" height="14" viewBox="0 0 24 24" fill="#2563eb"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>LinkedIn Profile</a>`
                                    : `<span onclick="editMyProfile()" style="display:inline-flex;align-items:center;gap:6px;margin-top:10px;padding:6px 13px;background:var(--latte-soft);border:1px dashed var(--latte);border-radius:8px;font-size:12.5px;color:var(--muted);cursor:pointer;transition:border-color .15s,color .15s;" onmouseover="this.style.borderColor='var(--caramel)';this.style.color='var(--caramel)'" onmouseout="this.style.borderColor='var(--latte)';this.style.color='var(--muted)'">+ Add LinkedIn URL</span>`}
                            </div>
                            <div style="display:flex;gap:8px;flex-shrink:0;margin-top:2px;">
                                <button class="mp2-ghost" style="background:transparent;border:1.5px solid var(--latte);border-radius:10px;padding:8px 16px;font-size:13px;font-weight:500;color:var(--muted);cursor:pointer;font-family:'DM Sans',sans-serif;" onclick="showToast('Share link copied!','success')">Share Profile</button>
                                <button title="Settings" onclick="switchView('settingsView')" style="background:transparent;border:1.5px solid var(--latte);border-radius:10px;padding:8px 12px;font-size:16px;cursor:pointer;transition:background .15s,border-color .15s;" onmouseover="this.style.background='var(--latte-soft)';this.style.borderColor='var(--caramel)'" onmouseout="this.style.background='transparent';this.style.borderColor='var(--latte)'">⚙️</button>
                            </div>
                        </div>
                        <!-- Stats bar -->
                        <div class="mp2-stats" style="display:flex;border-top:1px solid var(--latte);margin:0 -28px;">
                            <div class="mp2-stat" onclick="switchView('networkView')" style="flex:1;text-align:center;padding:14px 8px;border-right:1px solid var(--latte);cursor:pointer;transition:background .15s;">
                                <div style="font-family:'Playfair Display',serif;font-size:20px;color:var(--caramel);line-height:1;margin-bottom:3px;">${connections.length}</div>
                                <div style="font-size:11.5px;color:var(--muted);font-weight:500;">Connections</div>
                            </div>
                            <div class="mp2-stat" style="flex:1;text-align:center;padding:14px 8px;border-right:1px solid var(--latte);transition:background .15s;">
                                <div style="font-family:'Playfair Display',serif;font-size:20px;color:var(--caramel);line-height:1;margin-bottom:3px;">${chatsCompleted}</div>
                                <div style="font-size:11.5px;color:var(--muted);font-weight:500;">Chats Done</div>
                            </div>
                            <div class="mp2-stat" style="flex:1;text-align:center;padding:14px 8px;border-right:1px solid var(--latte);transition:background .15s;">
                                <div style="font-family:'Playfair Display',serif;font-size:20px;color:var(--caramel);line-height:1;margin-bottom:3px;">${upcomingCount}</div>
                                <div style="font-size:11.5px;color:var(--muted);font-weight:500;">Upcoming</div>
                            </div>
                            <div class="mp2-stat" style="flex:1;text-align:center;padding:14px 8px;transition:background .15s;">
                                <div style="font-family:'Playfair Display',serif;font-size:20px;color:var(--caramel);line-height:1;margin-bottom:3px;">${percentage}%</div>
                                <div style="font-size:11.5px;color:var(--muted);font-weight:500;">Profile Complete</div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- LOWER TWO-COLUMN -->
                <div class="mp2-lower" style="display:grid;grid-template-columns:1fr 300px;gap:20px;">

                    <!-- LEFT: About / Interests / Goals / Badges -->
                    <div style="display:flex;flex-direction:column;gap:20px;">

                        <div class="mp2-card" style="background:var(--card);border:1px solid var(--latte);border-radius:14px;box-shadow:0 2px 12px rgba(107,63,42,.09);overflow:hidden;">
                            <div style="padding:18px 22px 14px;border-bottom:1px solid var(--latte);display:flex;align-items:center;justify-content:space-between;">
                                <h3 style="font-family:'Playfair Display',serif;font-size:16px;color:var(--espresso);">About</h3>
                                <button onclick="editMyProfile()" style="background:none;border:none;color:var(--caramel);font-size:13px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;">Edit</button>
                            </div>
                            <div style="padding:20px 22px;">
                                ${profile.bio
                                    ? `<p style="font-size:14px;color:var(--brown);line-height:1.7;margin:0;">${profile.bio}</p>`
                                    : `<p style="font-size:14px;color:var(--muted);font-style:italic;margin:0;">No bio added yet. <span onclick="editMyProfile()" style="color:var(--caramel);font-weight:600;cursor:pointer;font-style:normal;">Add one →</span></p>`}
                            </div>
                        </div>

                        <div class="mp2-card" style="background:var(--card);border:1px solid var(--latte);border-radius:14px;box-shadow:0 2px 12px rgba(107,63,42,.09);overflow:hidden;">
                            <div style="padding:18px 22px 14px;border-bottom:1px solid var(--latte);display:flex;align-items:center;justify-content:space-between;">
                                <h3 style="font-family:'Playfair Display',serif;font-size:16px;color:var(--espresso);">Interests &amp; Passions</h3>
                                <button onclick="editMyProfile()" style="background:none;border:none;color:var(--caramel);font-size:13px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;">Edit</button>
                            </div>
                            <div style="padding:20px 22px;"><div style="display:flex;flex-wrap:wrap;gap:7px;">${tagsHtml}</div></div>
                        </div>

                        <div class="mp2-card" style="background:var(--card);border:1px solid var(--latte);border-radius:14px;box-shadow:0 2px 12px rgba(107,63,42,.09);overflow:hidden;">
                            <div style="padding:18px 22px 14px;border-bottom:1px solid var(--latte);display:flex;align-items:center;justify-content:space-between;">
                                <h3 style="font-family:'Playfair Display',serif;font-size:16px;color:var(--espresso);">Career Goals</h3>
                                <button onclick="editMyProfile()" style="background:none;border:none;color:var(--caramel);font-size:13px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;">Edit</button>
                            </div>
                            <div style="padding:20px 22px;">
                                ${profile.goals
                                    ? `<p style="font-size:14px;color:var(--brown);line-height:1.7;margin:0;border-left:3px solid var(--caramel);padding-left:14px;">${profile.goals}</p>`
                                    : `<p style="font-size:14px;color:var(--muted);font-style:italic;margin:0;">No goals added yet. <span onclick="editMyProfile()" style="color:var(--caramel);font-weight:600;cursor:pointer;font-style:normal;">Add yours →</span></p>`}
                            </div>
                        </div>

                        <div class="mp2-card" style="background:var(--card);border:1px solid var(--latte);border-radius:14px;box-shadow:0 2px 12px rgba(107,63,42,.09);overflow:hidden;">
                            <div style="padding:18px 22px 14px;border-bottom:1px solid var(--latte);display:flex;align-items:center;justify-content:space-between;">
                                <h3 style="font-family:'Playfair Display',serif;font-size:16px;color:var(--espresso);">Achievements</h3>
                                <button onclick="switchView('settingsView')" style="background:none;border:none;color:var(--caramel);font-size:13px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;">Manage</button>
                            </div>
                            <div style="padding:20px 22px;display:flex;flex-direction:column;gap:12px;">
                                ${_myAchs.length ? _myAchs.map(a => {
                                    const icon = ACH_TYPE_ICON[a.type] || '⭐';
                                    const dateStr = _fmtAchDate(a.start_date, a.end_date, a.is_current);
                                    return `<div style="display:flex;gap:12px;align-items:flex-start;">
                                        <div style="font-size:22px;flex-shrink:0;margin-top:2px;">${icon}</div>
                                        <div>
                                            <div style="font-size:14px;font-weight:600;color:var(--espresso);">${_achEsc(a.title)}</div>
                                            ${a.organization ? `<div style="font-size:12.5px;color:var(--brown);margin-top:1px;">${_achEsc(a.organization)}</div>` : ''}
                                            ${dateStr ? `<div style="font-size:12px;color:var(--muted);margin-top:1px;">${dateStr}</div>` : ''}
                                            ${a.description ? `<div style="font-size:13px;color:var(--brown);margin-top:4px;line-height:1.5;">${_achEsc(a.description)}</div>` : ''}
                                        </div>
                                    </div>`;
                                }).join('<hr style="border:none;border-top:1px solid var(--latte);margin:0;">')
                                : `<p style="font-size:13px;color:var(--muted);font-style:italic;margin:0;">No achievements yet. <span onclick="switchView('settingsView')" style="color:var(--caramel);font-weight:600;cursor:pointer;font-style:normal;">Add some →</span></p>`}
                            </div>
                        </div>

                        <div class="mp2-card" style="background:var(--card);border:1px solid var(--latte);border-radius:14px;box-shadow:0 2px 12px rgba(107,63,42,.09);overflow:hidden;">
                            <div style="padding:18px 22px 14px;border-bottom:1px solid var(--latte);">
                                <h3 style="font-family:'Playfair Display',serif;font-size:16px;color:var(--espresso);">🏅 Badges</h3>
                            </div>
                            <div style="padding:20px 22px;"><div class="badge-grid" id="myProfileBadgesView"></div></div>
                        </div>

                        <div class="mp2-card" style="background:var(--card);border:1px solid var(--latte);border-radius:14px;box-shadow:0 2px 12px rgba(107,63,42,.09);overflow:hidden;">
                            <div style="padding:18px 22px 14px;border-bottom:1px solid var(--latte);display:flex;align-items:center;justify-content:space-between;">
                                <h3 style="font-family:'Playfair Display',serif;font-size:16px;color:var(--espresso);">Your Posts</h3>
                                <button onclick="switchView('feedView')" style="background:none;border:none;color:var(--caramel);font-size:13px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;">+ New Post</button>
                            </div>
                            <div style="padding:14px 22px 20px;">
                                ${_myPosts.length > 0
                                    ? _myPosts.map(post => {
                                        const likeCount = _myPostLikeMap[post.id] || 0;
                                        const liked = _myPostLikedSet.has(post.id);
                                        const timeAgo = post.created_at ? getTimeAgo(post.created_at) : 'Recently';
                                        return `
                                        <div style="padding:12px 0;border-bottom:1px solid var(--latte-soft);">
                                            <p style="font-size:14px;color:var(--brown);line-height:1.6;margin:0 0 8px;">${post.content}</p>
                                            <div style="display:flex;align-items:center;gap:12px;">
                                                <span style="font-size:11px;color:var(--muted);">${timeAgo}</span>
                                                <button class="post-action-btn${liked ? ' liked' : ''}" id="mplike-${post.id}" onclick="likePost('${post.id}', this)" style="font-size:12px;padding:3px 8px;${liked ? 'color:var(--primary);font-weight:700;' : ''}">👍 <span id="mplikecount-${post.id}">${likeCount}</span></button>
                                                <button class="post-action-btn" onclick="toggleComments('${post.id}')" style="font-size:12px;padding:3px 8px;">💬 Comments</button>
                                            </div>
                                            <div id="comments-${post.id}" style="display:none;margin-top:10px;padding-top:10px;border-top:1px solid var(--latte-soft);">
                                                <div id="comments-list-${post.id}" style="margin-bottom:8px;"></div>
                                                <div style="display:flex;gap:8px;">
                                                    <input type="text" id="comment-input-${post.id}" placeholder="Write a comment…" style="flex:1;padding:7px 10px;border-radius:8px;border:1px solid var(--border);font-size:13px;font-family:'DM Sans',sans-serif;" onkeypress="if(event.key==='Enter') submitComment('${post.id}')">
                                                    <button class="btn btn-primary btn-sm" onclick="submitComment('${post.id}')" style="font-size:12px;padding:5px 12px;">Post</button>
                                                </div>
                                            </div>
                                        </div>`;
                                    }).join('')
                                    : `<p style="font-size:13px;color:var(--muted);font-style:italic;margin:0;">You haven't posted anything yet. <span onclick="switchView('feedView')" style="color:var(--caramel);cursor:pointer;font-weight:600;font-style:normal;">Share something in the Feed →</span></p>`}
                            </div>
                        </div>

                    </div>

                    <!-- RIGHT: Strength / Availability / Resume -->
                    <div style="display:flex;flex-direction:column;gap:20px;">

                        <div class="mp2-card" style="background:var(--card);border:1px solid var(--latte);border-radius:14px;box-shadow:0 2px 12px rgba(107,63,42,.09);overflow:hidden;">
                            <div style="padding:18px 22px 14px;border-bottom:1px solid var(--latte);">
                                <h3 style="font-family:'Playfair Display',serif;font-size:16px;color:var(--espresso);">Profile Strength</h3>
                            </div>
                            <div style="padding:20px 22px;">
                                <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--muted);">
                                    <span>Progress</span>
                                    <strong style="color:var(--caramel);font-weight:700;">${percentage}% complete</strong>
                                </div>
                                <div style="background:var(--latte-soft);border-radius:99px;height:8px;overflow:hidden;margin:10px 0 6px;">
                                    <div style="height:100%;width:${percentage}%;background:linear-gradient(90deg,var(--espresso),var(--caramel));border-radius:99px;animation:mpFillBar 1.2s cubic-bezier(0.22,1,0.36,1) forwards;"></div>
                                </div>
                                <div style="font-size:11px;color:var(--muted);margin-bottom:14px;">Complete profiles get 3× more requests</div>
                                <div style="display:flex;flex-direction:column;gap:8px;">
                                    ${compItems.map(item => `
                                        <div style="display:flex;align-items:center;gap:10px;font-size:13px;color:${item.done ? 'var(--brown)' : 'var(--muted)'};">
                                            <span style="width:7px;height:7px;border-radius:50%;flex-shrink:0;background:${item.done ? '#2d6a4f' : 'transparent'};border:${item.done ? 'none' : '1.5px solid var(--muted)'};display:inline-block;"></span>
                                            ${item.label}
                                        </div>`).join('')}
                                </div>
                                <button onclick="switchView('settingsView')" class="mp2-btn" style="width:100%;margin-top:16px;padding:10px;background:var(--espresso);color:var(--cream);border:none;border-radius:10px;font-size:13.5px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;text-align:center;box-shadow:0 3px 12px rgba(28,18,8,.2);">✏️ Complete Profile</button>
                            </div>
                        </div>

                        <div class="mp2-card" style="background:var(--card);border:1px solid var(--latte);border-radius:14px;box-shadow:0 2px 12px rgba(107,63,42,.09);overflow:hidden;">
                            <div style="padding:18px 22px 14px;border-bottom:1px solid var(--latte);display:flex;align-items:center;justify-content:space-between;">
                                <h3 style="font-family:'Playfair Display',serif;font-size:16px;color:var(--espresso);">Availability</h3>
                                <button onclick="switchView('settingsView')" style="background:none;border:none;color:var(--caramel);font-size:13px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;">Edit</button>
                            </div>
                            <div style="padding:14px 22px 20px;">
                                ${availRows.length > 0
                                    ? openDaysHtml + closedHtml
                                    : `<p style="font-size:13px;color:var(--muted);font-style:italic;padding:6px 0;">No availability set. <span onclick="switchView('settingsView')" style="color:var(--caramel);font-weight:600;cursor:pointer;font-style:normal;">Set hours →</span></p>`}
                                ${availRows.length > 0 ? `
                                <div style="margin-top:14px;display:flex;gap:8px;flex-wrap:wrap;">
                                    <span style="display:inline-flex;align-items:center;gap:4px;background:var(--latte-soft);border:1px solid var(--latte);border-radius:99px;padding:3px 10px;font-size:12px;color:var(--brown);font-weight:500;">💻 Virtual</span>
                                    <span style="display:inline-flex;align-items:center;gap:4px;background:var(--latte-soft);border:1px solid var(--latte);border-radius:99px;padding:3px 10px;font-size:12px;color:var(--brown);font-weight:500;">☕ In-person</span>
                                </div>` : ''}
                            </div>
                        </div>

                        <div class="mp2-card" style="background:var(--card);border:1px solid var(--latte);border-radius:14px;box-shadow:0 2px 12px rgba(107,63,42,.09);overflow:hidden;">
                            <div style="padding:18px 22px 14px;border-bottom:1px solid var(--latte);display:flex;align-items:center;justify-content:space-between;">
                                <h3 style="font-family:'Playfair Display',serif;font-size:16px;color:var(--espresso);">Resume</h3>
                                ${profile.resume ? `<button onclick="editMyProfile()" style="background:none;border:none;color:var(--caramel);font-size:13px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;">Replace</button>` : ''}
                            </div>
                            <div style="padding:20px 22px;">
                                ${profile.resume
                                    ? `<div class="mp2-resume" onclick="openResume('${profile.resume}')" style="display:flex;align-items:center;gap:12px;background:var(--latte-soft);border:1px solid var(--latte);border-radius:10px;padding:12px 16px;cursor:pointer;transition:all .15s;">
                                        <span style="font-size:22px;">📄</span>
                                        <div>
                                            <div style="font-size:13.5px;font-weight:600;color:var(--espresso);">${profile.firstName} ${profile.lastName} — Resume</div>
                                            <div style="font-size:11.5px;color:var(--muted);margin-top:1px;">Click to view</div>
                                        </div>
                                       </div>
                                       <p style="font-size:12px;color:var(--muted);margin-top:10px;">Only visible to connections you approve.</p>`
                                    : `<p style="font-size:13px;color:var(--muted);font-style:italic;">No resume uploaded. <span onclick="editMyProfile()" style="color:var(--caramel);font-weight:600;cursor:pointer;font-style:normal;">Upload one →</span></p>`}
                            </div>
                        </div>

                    </div>
                </div>
            `;

            setTimeout(() => renderBadges('myProfileBadgesView'), 50);
        }

        function showProfilePreview() {
            const modal = document.getElementById('profilePreviewModal');
            const body  = document.getElementById('profilePreviewBody');
            if (!modal || !body) return;
            if (!_myProfilePreviewData) { showToast('Profile not loaded yet.', 'info'); return; }

            const { profile, availRows, tagsHtml, chips } = _myProfilePreviewData;
            const initials   = `${(profile.firstName||'?')[0]}${(profile.lastName||'?')[0]}`.toUpperCase();
            const avatarBg   = profile.profilePicture ? 'none' : (profile.avatarColor || 'linear-gradient(135deg,var(--caramel),var(--espresso))');
            const avatarInner = profile.profilePicture
                ? `<img src="${profile.profilePicture}" alt="${profile.firstName}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`
                : initials;

            const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
            const fmt = t => { if (!t) return ''; const [h,m]=t.split(':'); const hr=parseInt(h); return `${hr>12?hr-12:(hr===0?12:hr)}:${m} ${hr>=12?'PM':'AM'}`; };
            const availHtml = availRows.map(r => `
                <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--latte-soft);font-size:13px;">
                    <span style="font-weight:600;width:36px;color:var(--brown);">${dayNames[r.day_of_week]}</span>
                    <span style="color:var(--muted);font-size:12.5px;">${fmt(r.start_time)} – ${fmt(r.end_time)}</span>
                    <span style="font-size:11px;font-weight:700;padding:2px 8px;border-radius:99px;background:#eaf4ee;color:#2d6a4f;">Open</span>
                </div>`).join('');

            body.innerHTML = `
                <div style="background:rgba(192,124,58,0.1);border:1px solid var(--latte);border-radius:12px;padding:12px 18px;margin-bottom:20px;display:flex;align-items:center;gap:10px;">
                    <span style="font-size:20px;">👁</span>
                    <div>
                        <div style="font-size:13px;font-weight:600;color:var(--espresso);">Preview Mode</div>
                        <div style="font-size:12px;color:var(--muted);">This is how your profile appears to other people on First Sip.</div>
                    </div>
                </div>

                <div style="background:var(--card);border:1px solid var(--latte);border-radius:14px;box-shadow:0 2px 12px rgba(107,63,42,.09);overflow:hidden;margin-bottom:16px;">
                    <div style="height:80px;background:linear-gradient(135deg,var(--espresso) 0%,var(--caramel) 60%,#e8c49a 100%);"></div>
                    <div style="padding:0 24px 22px;position:relative;">
                        <div style="display:inline-block;margin-top:-32px;margin-bottom:10px;">
                            <div style="width:64px;height:64px;border-radius:50%;background:${avatarBg};display:flex;align-items:center;justify-content:center;font-family:'Playfair Display',serif;font-size:22px;font-weight:700;color:#fff;border:3px solid var(--card);box-shadow:0 2px 10px rgba(107,63,42,.22);overflow:hidden;">${avatarInner}</div>
                        </div>
                        <div style="font-family:'Playfair Display',serif;font-size:20px;color:var(--espresso);line-height:1.2;margin-bottom:4px;">${profile.firstName} ${profile.lastName}</div>
                        <div style="font-size:13.5px;color:var(--brown);font-weight:500;margin-bottom:10px;">${profile.headline || [profile.role,profile.industry].filter(Boolean).join(' · ') || ''}</div>
                        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:16px;">
                            ${chips.map(c => `<span style="display:inline-flex;align-items:center;gap:4px;background:var(--latte-soft);border:1px solid var(--latte);border-radius:99px;padding:3px 10px;font-size:12px;color:var(--brown);font-weight:500;">${c}</span>`).join('')}
                            <span style="display:inline-flex;align-items:center;gap:4px;background:#eaf4ee;border:1px solid #b7dfc9;border-radius:99px;padding:3px 10px;font-size:12px;color:#2d6a4f;font-weight:500;">🟢 Open to chats</span>
                        </div>
                        <div style="display:flex;gap:10px;flex-wrap:wrap;">
                            <button disabled style="padding:9px 20px;background:var(--espresso);color:var(--cream);border:none;border-radius:10px;font-size:13px;font-weight:600;cursor:not-allowed;font-family:'DM Sans',sans-serif;opacity:.6;">Add Connection</button>
                            <button disabled style="padding:9px 20px;background:transparent;border:1.5px solid var(--latte);border-radius:10px;font-size:13px;font-weight:500;color:var(--muted);cursor:not-allowed;font-family:'DM Sans',sans-serif;opacity:.6;">Request Chat</button>
                        </div>
                    </div>
                </div>

                ${profile.bio ? `
                <div style="background:var(--card);border:1px solid var(--latte);border-radius:14px;box-shadow:0 2px 12px rgba(107,63,42,.09);overflow:hidden;margin-bottom:16px;">
                    <div style="padding:16px 22px 12px;border-bottom:1px solid var(--latte);"><h3 style="font-family:'Playfair Display',serif;font-size:15px;color:var(--espresso);margin:0;">About</h3></div>
                    <div style="padding:18px 22px;"><p style="font-size:14px;color:var(--brown);line-height:1.7;margin:0;">${profile.bio}</p></div>
                </div>` : ''}

                ${(profile.interests||[]).length || (profile.hobbies||[]).length ? `
                <div style="background:var(--card);border:1px solid var(--latte);border-radius:14px;box-shadow:0 2px 12px rgba(107,63,42,.09);overflow:hidden;margin-bottom:16px;">
                    <div style="padding:16px 22px 12px;border-bottom:1px solid var(--latte);"><h3 style="font-family:'Playfair Display',serif;font-size:15px;color:var(--espresso);margin:0;">Interests &amp; Passions</h3></div>
                    <div style="padding:18px 22px;"><div style="display:flex;flex-wrap:wrap;gap:7px;">${tagsHtml}</div></div>
                </div>` : ''}

                ${profile.goals ? `
                <div style="background:var(--card);border:1px solid var(--latte);border-radius:14px;box-shadow:0 2px 12px rgba(107,63,42,.09);overflow:hidden;margin-bottom:16px;">
                    <div style="padding:16px 22px 12px;border-bottom:1px solid var(--latte);"><h3 style="font-family:'Playfair Display',serif;font-size:15px;color:var(--espresso);margin:0;">Career Goals</h3></div>
                    <div style="padding:18px 22px;"><p style="font-size:14px;color:var(--brown);line-height:1.7;margin:0;border-left:3px solid var(--caramel);padding-left:14px;">${profile.goals}</p></div>
                </div>` : ''}

                ${availRows.length > 0 ? `
                <div style="background:var(--card);border:1px solid var(--latte);border-radius:14px;box-shadow:0 2px 12px rgba(107,63,42,.09);overflow:hidden;">
                    <div style="padding:16px 22px 12px;border-bottom:1px solid var(--latte);"><h3 style="font-family:'Playfair Display',serif;font-size:15px;color:var(--espresso);margin:0;">Availability</h3></div>
                    <div style="padding:14px 22px 18px;">${availHtml}</div>
                </div>` : ''}
            `;
            modal.classList.add('active');
        }

        // ============================================
        // MY NETWORK VIEW
        // ============================================

        function switchNwTab(btn, panelId) {
            document.querySelectorAll('.nw-tab').forEach(t => t.classList.remove('active'));
            btn.classList.add('active');
            document.querySelectorAll('.nw-panel').forEach(p => p.classList.remove('active'));
            const panel = document.getElementById(panelId);
            if (panel) panel.classList.add('active');
        }

        // Generate a deterministic gradient color from a user ID or name
        function nwAvatarGradient(str) {
            const palettes = [
                'linear-gradient(135deg,#5c3317,#b5651d)',
                'linear-gradient(135deg,#2563eb,#5c9ef5)',
                'linear-gradient(135deg,#7e3ff2,#c084fc)',
                'linear-gradient(135deg,#2d7a4f,#52c887)',
                'linear-gradient(135deg,#c0392b,#e74c3c)',
                'linear-gradient(135deg,#d4894a,#b5651d)',
                'linear-gradient(135deg,#1a7fa0,#48c4e8)',
                'linear-gradient(135deg,#6d3a8e,#b97cd4)',
            ];
            let hash = 0;
            for (let i = 0; i < (str || '').length; i++) hash = (hash * 31 + str.charCodeAt(i)) & 0xffff;
            return palettes[hash % palettes.length];
        }

        function nwAvatarInner(user) {
            if (user.profilePicture) return `<img src="${user.profilePicture}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
            const fn = user.firstName || user.first_name || '?';
            const ln = user.lastName  || user.last_name  || '?';
            return `${fn[0]}${ln[0]}`.toUpperCase();
        }

        async function renderNetworkView() {
            // Fetch incoming and outgoing requests fresh with joined profile data
            let incoming = [], outgoing = [];
            try {
                const { data: inc } = await supabaseClient
                    .from('connections')
                    .select('*, sender:profiles!connections_user_id_fkey(id,first_name,last_name,headline,major,status,avatar_color,profile_picture)')
                    .eq('connected_user_id', currentUser.id)
                    .eq('status', 'pending');
                incoming = inc || [];
            } catch(e) { console.error('renderNetworkView incoming:', e); }

            try {
                const { data: out } = await supabaseClient
                    .from('connections')
                    .select('*, receiver:profiles!connections_connected_user_id_fkey(id,first_name,last_name,headline,major,status,avatar_color,profile_picture)')
                    .eq('user_id', currentUser.id)
                    .eq('status', 'pending');
                outgoing = out || [];
            } catch(e) { console.error('renderNetworkView outgoing:', e); }

            // Keep global arrays in sync
            sentRequests = outgoing;

            const reqCount = incoming.length + outgoing.length;

            // Build suggestion pool: users not connected, not pending, not self
            const connectedIds = new Set();
            connections.forEach(c => { connectedIds.add(c.user_id); connectedIds.add(c.connected_user_id); });
            outgoing.forEach(r => connectedIds.add(r.connected_user_id));
            incoming.forEach(r => connectedIds.add(r.user_id));
            const suggestions = users.filter(u => u.id !== currentUser.id && !connectedIds.has(u.id));

            // Update hero stats
            const heroStats = document.getElementById('nwHeroStats');
            if (heroStats) {
                heroStats.innerHTML = `
                    <div class="nw-stat"><div class="nw-stat-val">${connections.length}</div><div class="nw-stat-lbl">Connections</div></div>
                    <div class="nw-stat"><div class="nw-stat-val">${reqCount}</div><div class="nw-stat-lbl">Requests</div></div>
                    <div class="nw-stat"><div class="nw-stat-val">${suggestions.length}</div><div class="nw-stat-lbl">Suggested</div></div>
                `;
            }

            // Update tab counts
            const el = id => document.getElementById(id);
            if (el('nwTabCountConn')) el('nwTabCountConn').textContent = connections.length;
            if (el('nwTabCountReq'))  el('nwTabCountReq').textContent  = reqCount;
            if (el('nwTabCountSug'))  el('nwTabCountSug').textContent  = suggestions.length;

            renderNwConnections();
            renderNwRequests(incoming, outgoing);
            renderNwSuggestions(suggestions);
        }

        function renderNwConnections() {
            const grid = document.getElementById('nwConnectionsGrid');
            if (!grid) return;

            const query = (document.getElementById('nwSearchInput')?.value || '').toLowerCase();

            // Resolve the other user for each accepted connection
            const connCards = connections.map(c => {
                const otherId = c.user_id === currentUser.id ? c.connected_user_id : c.user_id;
                return users.find(u => u.id === otherId);
            }).filter(Boolean);

            const filtered = query
                ? connCards.filter(u => {
                    const full = `${u.firstName || u.first_name || ''} ${u.lastName || u.last_name || ''}`.toLowerCase();
                    return full.includes(query) || (u.industry || '').toLowerCase().includes(query) || (u.role || '').toLowerCase().includes(query);
                  })
                : connCards;

            if (!filtered.length) {
                grid.innerHTML = `<div class="nw-empty" style="grid-column:1/-1;">
                    <div class="nw-empty-icon">🤝</div>
                    <div class="nw-empty-title">${query ? 'No matches found' : 'No connections yet'}</div>
                    <div class="nw-empty-desc">${query ? 'Try a different name or keyword.' : 'Head to Discover to start growing your network.'}</div>
                </div>`;
                return;
            }

            grid.innerHTML = filtered.map(u => {
                const fn = u.firstName || u.first_name || '?';
                const ln = u.lastName  || u.last_name  || '?';
                const grad = nwAvatarGradient(u.id);
                const inner = nwAvatarInner(u);
                const role = [u.role, u.industry].filter(Boolean).join(' · ') || 'Rowan University';
                const tags = [...(u.interests || []), ...(u.hobbies || [])].slice(0, 3);
                const isAlumni = u.gradYear && parseInt(u.gradYear) < new Date().getFullYear();
                return `
                <div class="nw-conn-card" onclick="viewProfile('${u.id}')">
                    <div class="nw-cc-top">
                        <div class="nw-cc-avatar-wrap">
                            <div class="nw-cc-avatar" style="background:${grad};">${inner}</div>
                            ${u.isOnline ? '<span class="nw-cc-online"></span>' : ''}
                        </div>
                    </div>
                    <div class="nw-cc-body">
                        ${isAlumni ? '<div class="nw-alumni-pill">🎓 Alumni</div>' : ''}
                        <div class="nw-cc-name">${fn} ${ln}</div>
                        <div class="nw-cc-role">${role}</div>
                        ${tags.length ? `<div class="nw-cc-tags">${tags.map((t,i) => `<span class="nw-cc-tag${i===0?' hi':''}">${t}</span>`).join('')}</div>` : ''}
                    </div>
                    <div class="nw-cc-footer" onclick="event.stopPropagation()">
                        ${sentChatInvites.find(i => i.receiver_id === u.id)
                            ? `<button class="nw-btn-chat" disabled style="opacity:.55;cursor:default;">✓ Invited</button>`
                            : `<button class="nw-btn-chat" onclick="sendChatInvite('${u.id}')">☕ Chat</button>`}
                        <button class="nw-btn-msg" onclick="startMessage('${u.id}')">💬</button>
                    </div>
                </div>`;
            }).join('');
        }

        function filterNwConnections() { renderNwConnections(); }

        function renderNwRequests(incoming, outgoing) {
            const incomingEl = document.getElementById('nwIncomingList');
            const sentEl     = document.getElementById('nwSentList');
            const inCount    = document.getElementById('nwIncomingCount');
            const sCount     = document.getElementById('nwSentCount');

            if (inCount) inCount.textContent = incoming.length ? `${incoming.length} pending` : '';
            if (sCount)  sCount.textContent  = outgoing.length ? `${outgoing.length} pending` : '';

            // INCOMING — requests sent TO the current user
            if (incomingEl) {
                if (!incoming.length) {
                    incomingEl.innerHTML = `<div class="nw-empty"><div class="nw-empty-icon">📬</div><div class="nw-empty-title">No incoming requests</div><div class="nw-empty-desc">When someone sends you a connection request, it will appear here.</div></div>`;
                } else {
                    incomingEl.innerHTML = incoming.map(req => {
                        const p = req.sender || {};
                        const fn = p.first_name || '?';
                        const ln = p.last_name  || '?';
                        const grad = nwAvatarGradient(p.id || req.user_id);
                        const inner = p.profile_picture
                            ? `<img src="${p.profile_picture}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`
                            : `${fn[0]}${ln[0]}`.toUpperCase();
                        const role = p.headline || p.major || 'Rowan University';
                        const note = req.note || '';
                        return `
                        <div class="nw-req-card">
                            <div class="nw-req-avatar" style="background:${grad};">${inner}</div>
                            <div class="nw-req-info">
                                <div class="nw-req-name">${fn} ${ln}</div>
                                <div class="nw-req-role">${role}</div>
                                ${note ? `<div class="nw-req-note">"${note}"</div>` : ''}
                                <div class="nw-req-actions">
                                    <button class="nw-btn-accept" onclick="acceptNwRequest('${req.id}')">✓ Accept</button>
                                    <button class="nw-btn-decline" onclick="rejectNwRequest('${req.id}')">✕ Decline</button>
                                </div>
                            </div>
                        </div>`;
                    }).join('');
                }
            }

            // OUTGOING — requests the current user sent
            if (sentEl) {
                if (!outgoing.length) {
                    sentEl.innerHTML = `<div class="nw-empty"><div class="nw-empty-icon">📤</div><div class="nw-empty-title">No sent requests</div><div class="nw-empty-desc">Head to Discover to find people to connect with.</div></div>`;
                } else {
                    sentEl.innerHTML = outgoing.map(req => {
                        const p = req.receiver || {};
                        const fn = p.first_name || '?';
                        const ln = p.last_name  || '?';
                        const grad = nwAvatarGradient(p.id || req.connected_user_id);
                        const inner = p.profile_picture
                            ? `<img src="${p.profile_picture}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`
                            : `${fn[0]}${ln[0]}`.toUpperCase();
                        const role = p.headline || p.major || 'Rowan University';
                        const note = req.note || '';
                        return `
                        <div class="nw-req-card">
                            <div class="nw-req-avatar" style="background:${grad};">${inner}</div>
                            <div class="nw-req-info">
                                <div class="nw-req-name">${fn} ${ln}</div>
                                <div class="nw-req-role">${role}</div>
                                ${note ? `<div class="nw-req-note">"${note}"</div>` : ''}
                                <div class="nw-req-actions">
                                    <button class="nw-btn-decline" onclick="cancelNwRequest('${req.id}')">✕ Cancel Request</button>
                                </div>
                                <div class="nw-req-time">Awaiting response</div>
                            </div>
                        </div>`;
                    }).join('');
                }
            }
        }

        function renderNwSuggestions(suggestions) {
            const el = document.getElementById('nwSuggestionsContent');
            if (!el) return;

            if (!suggestions.length) {
                el.innerHTML = `<div class="nw-empty"><div class="nw-empty-icon">✨</div><div class="nw-empty-title">You know everyone!</div><div class="nw-empty-desc">No suggestions right now. Check back after more students join.</div></div>`;
                return;
            }

            // Group by shared interest with currentUser
            const myInterests = new Set([...(currentUser.interests || []), ...(currentUser.hobbies || [])]);
            const myIndustry = currentUser.industry || '';

            const sameField = suggestions.filter(u => u.industry && u.industry === myIndustry);
            const others    = suggestions.filter(u => !u.industry || u.industry !== myIndustry);

            function renderSugCard(u) {
                const fn = u.firstName || u.first_name || '?';
                const ln = u.lastName  || u.last_name  || '?';
                const grad = nwAvatarGradient(u.id);
                const inner = nwAvatarInner(u);
                const role = [u.role, u.industry].filter(Boolean).join(' · ') || 'Rowan University';
                const shared = [...(u.interests || []), ...(u.hobbies || [])].filter(t => myInterests.has(t));
                const reason = shared.length
                    ? `Both interested in ${shared.slice(0,2).join(' & ')}.`
                    : u.industry === myIndustry
                    ? `Both in ${u.industry}.`
                    : `Student at Rowan University.`;
                const tags = [...(u.interests || [])].slice(0, 3);
                return `
                <div class="nw-sug-card">
                    <div class="nw-sug-banner" style="position:relative;">
                        <div class="nw-sug-avatar" style="background:${grad};">${inner}</div>
                    </div>
                    <div class="nw-sug-body">
                        <div class="nw-sug-name">${fn} ${ln}</div>
                        <div class="nw-sug-role">${role}</div>
                        <div class="nw-sug-reason"><span style="flex-shrink:0;">💡</span>${reason}</div>
                        ${tags.length ? `<div class="nw-sug-tags">${tags.map(t => `<span class="nw-sug-tag">${t}</span>`).join('')}</div>` : ''}
                    </div>
                    <div class="nw-sug-footer">
                        <button class="nw-btn-connect" onclick="connectUser('${u.id}')">🤝 Connect</button>
                        <button class="nw-btn-view" onclick="viewProfile('${u.id}')">View</button>
                    </div>
                </div>`;
            }

            let html = '';
            if (sameField.length) {
                html += `<div class="nw-suggest-section">
                    <h2 class="nw-suggest-title">People in <em>${myIndustry || 'your field'}</em></h2>
                    <div class="nw-suggest-grid">${sameField.map(renderSugCard).join('')}</div>
                </div>`;
            }
            if (others.length) {
                html += `<div class="nw-suggest-section">
                    <h2 class="nw-suggest-title">Others you might <em>know</em></h2>
                    <div class="nw-suggest-grid">${others.map(renderSugCard).join('')}</div>
                </div>`;
            }
            el.innerHTML = html;
        }

        async function acceptNwRequest(reqId) {
            await acceptConnection(reqId);
            renderNetworkView();
        }

        async function rejectNwRequest(reqId) {
            await rejectConnection(reqId);
            renderNetworkView();
        }

        async function cancelNwRequest(reqId) {
            try {
                const { error } = await supabaseClient.from('connections').delete().eq('id', reqId);
                if (error) throw error;
                sentRequests = sentRequests.filter(r => r.id !== reqId);
                showToast('Request cancelled.', 'info');
                renderNetworkView();
            } catch (e) { showToast('Failed to cancel: ' + e.message, 'error'); }
        }

        // ============================================
        // UTILITY FUNCTIONS
        // ============================================

        function getTimeAgo(date) {
            if (!date) return '';
            const now = Date.now();
            const diff = now - new Date(date).getTime();
            const mins = Math.floor(diff / 60000);
            const hours = Math.floor(diff / 3600000);
            const days = Math.floor(diff / 86400000);
            if (mins < 1) return 'Just now';
            if (mins < 60) return `${mins}m ago`;
            if (hours < 24) return `${hours}h ago`;
            if (days < 7) return `${days}d ago`;
            return `${Math.floor(days / 7)}w ago`;
        }

        function animateCounter(elementId, target) {
            const el = document.getElementById(elementId);
            if (!el) return;
            const current = parseInt(el.textContent) || 0;
            if (current === target) { el.textContent = target; return; }
            const duration = 600;
            const start = performance.now();
            function tick(now) {
                const elapsed = now - start;
                const progress = Math.min(elapsed / duration, 1);
                const eased = 1 - Math.pow(1 - progress, 3);
                el.textContent = Math.round(current + (target - current) * eased);
                if (progress < 1) requestAnimationFrame(tick);
            }
            requestAnimationFrame(tick);
        }

        // ============================================
        // TOAST NOTIFICATIONS
        // ============================================

        function showToast(message, type = 'info') {
            const container = document.getElementById('toastContainer');
            if (!container) return;
            const icons = { success: '&#10003;', info: '&#9749;', warning: '&#9888;', error: '&#10007;', celebration: '&#127881;' };
            const toast = document.createElement('div');
            toast.className = `toast ${type}`;
            toast.innerHTML = `<span>${icons[type] || ''}</span> ${message}`;
            container.appendChild(toast);
            setTimeout(() => { if (toast.parentNode) toast.remove(); }, 3200);
        }

        // ============================================
        // CONFETTI
        // ============================================

        function showConfetti() {
            const colors = ['#D4A574', '#6F4E37', '#FF9800', '#4CAF50', '#FF6B6B', '#8B6F47'];
            for (let i = 0; i < 30; i++) {
                const piece = document.createElement('div');
                piece.className = 'confetti-piece';
                piece.style.left = `${Math.random() * 100}vw`;
                piece.style.top = `${Math.random() * 30}vh`;
                piece.style.background = colors[Math.floor(Math.random() * colors.length)];
                piece.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
                piece.style.width = `${6 + Math.random() * 6}px`;
                piece.style.height = `${6 + Math.random() * 6}px`;
                piece.style.animationDuration = `${1 + Math.random() * 1.5}s`;
                piece.style.animationDelay = `${Math.random() * 0.5}s`;
                document.body.appendChild(piece);
                setTimeout(() => piece.remove(), 3000);
            }
        }

        // ============================================
        // PROFILE COMPLETION
        // ============================================

        function getProfileCompletion() {
            if (!currentUser) return { percentage: 0, missing: [], completed: [] };
            const fields = [
                { key: 'firstName', label: 'First Name' },
                { key: 'lastName', label: 'Last Name' },
                { key: 'bio', label: 'Bio' },
                { key: 'role', label: 'Status' },
                { key: 'company', label: 'School' },
                { key: 'location', label: 'Location' },
                { key: 'industry', label: 'Field of Study' },
                { key: 'interests', label: 'Interests', isArray: true },
                { key: 'hobbies', label: 'Hobbies', isArray: true },
                { key: 'goals', label: 'Career Goals' },
                { key: 'profilePicture', label: 'Profile Picture' },
                { key: 'resume', label: 'Resume' }
            ];
            const completed = [];
            const missing = [];
            fields.forEach(f => {
                const val = currentUser[f.key];
                const filled = f.isArray ? (val && val.length > 0) : (val && val.trim && val.trim() !== '');
                if (filled) completed.push(f.label);
                else missing.push(f.label);
            });
            return {
                percentage: Math.round((completed.length / fields.length) * 100),
                missing,
                completed
            };
        }

        function renderProfileCompletion() {
            const { percentage, missing } = getProfileCompletion();
            const ring = document.getElementById('progressRing');
            const text = document.getElementById('progressPercent');
            const msg = document.getElementById('completionMsg');
            const card = document.getElementById('completionCard');
            if (!ring || !text) return;

            const circumference = 2 * Math.PI * 34;
            const offset = circumference - (percentage / 100) * circumference;
            ring.style.strokeDasharray = circumference;
            setTimeout(() => { ring.style.strokeDashoffset = offset; }, 100);
            text.textContent = percentage + '%';

            if (percentage === 100) {
                if (card) card.style.display = 'none';
            } else {
                if (card) card.style.display = 'flex';
                msg.textContent = `Add: ${missing.slice(0, 3).join(', ')}${missing.length > 3 ? '...' : ''}`;
            }
        }

        // ============================================
        // GETTING STARTED CHECKLIST
        // ============================================

        function renderGettingStarted() {
            const container = document.getElementById('gettingStarted');
            const list = document.getElementById('checklistItems');
            if (!container || !list) return;

            if (localStorage.getItem('gettingStartedDismissed') === 'true') {
                container.style.display = 'none';
                return;
            }
            container.style.display = 'block';

            const { percentage } = getProfileCompletion();
            const hasConnections = connections.length > 0;
            const hasJoinedGroup = myGroupIds.size > 0;
            const hasSentMessage = sentMessageCount > 0;
            const hasMeeting = meetings.length > 0;

            const items = [
                { label: 'Complete your profile', done: percentage >= 80, action: 'editMyProfile()' },
                { label: 'Discover people to connect with', done: hasConnections, action: "switchView('discoverView')" },
                { label: 'Join a community', done: hasJoinedGroup, action: "switchView('groupsView')" },
                { label: 'Send your first message', done: hasSentMessage, action: "switchView('messagesView')" },
                { label: 'Schedule a coffee chat', done: hasMeeting, action: "switchView('messagesView')" }
            ];

            list.innerHTML = items.map(item => `
                <li class="checklist-item ${item.done ? 'done' : ''}" onclick="${item.action}">
                    <span class="check-icon">${item.done ? '&#10003;' : ''}</span>
                    <span class="check-label">${item.label}</span>
                </li>
            `).join('');
        }

        function dismissGettingStarted() {
            localStorage.setItem('gettingStartedDismissed', 'true');
            const el = document.getElementById('gettingStarted');
            if (el) el.style.display = 'none';
        }

        // ============================================
        // NOTIFICATIONS
        // ============================================

        let notifications = [];

        function generateNotifications() {
            // Keep DB-persisted notifications; rebuild the in-memory generated ones
            notifications = notifications.filter(n => n.dbId);
            const now = new Date();

            // Upcoming meeting reminders
            meetings.forEach(m => {
                const meetingTime = new Date(m.start_time || m.startTime);
                const hoursUntil = (meetingTime - now) / 3600000;
                if (hoursUntil > 0 && hoursUntil < 24) {
                    const partner = users.find(u => u.id === m.participant_id || u.id === m.participantId);
                    notifications.push({
                        id: 'meeting-' + m.id,
                        type: 'meeting',
                        icon: '&#128197;',
                        text: `Upcoming chat${partner ? ` with ${partner.firstName}` : ''} in ${Math.round(hoursUntil)}h`,
                        time: meetingTime,
                        unread: true
                    });
                }
            });

            // Pending connection requests
            if (pendingRequests.length > 0) {
                pendingRequests.forEach(req => {
                    const senderId = req.sender_id || req.user_id;
                    const requester = users.find(u => u.id === senderId);
                    const name = requester ? `${requester.firstName} ${requester.lastName}` : 'Someone';
                    notifications.unshift({
                        id: 'pending-' + req.id,
                        type: 'connection',
                        icon: '🤝',
                        text: `${name} wants to connect with you`,
                        time: new Date(req.created_at || now),
                        unread: true,
                        action: () => switchHubTab('network')
                    });
                });
            }

            // Pending chat invites
            if (chatInvites.length > 0) {
                chatInvites.forEach(invite => {
                    const requester = users.find(u => u.id === invite.sender_id);
                    const name = requester ? `${requester.firstName} ${requester.lastName}` : 'Someone';
                    notifications.unshift({
                        id: 'cinvite-' + invite.id,
                        type: 'chat_invite',
                        icon: '☕',
                        text: `${name} wants to have a coffee chat!`,
                        time: new Date(invite.created_at || now),
                        unread: true,
                        action: () => switchHubTab('network')
                    });
                });
            }

            // Connection notifications
            if (connections.length > 0) {
                notifications.push({
                    id: 'conn-welcome',
                    type: 'connection',
                    icon: '&#129309;',
                    text: `You have ${connections.length} connection${connections.length > 1 ? 's' : ''}. Keep growing your network!`,
                    time: new Date(now - 3600000),
                    unread: false
                });
            }

            // Welcome notification
            notifications.push({
                id: 'welcome',
                type: 'event',
                icon: '&#9749;',
                text: 'Welcome to First Sip! Start by completing your profile.',
                time: new Date(now - 86400000),
                unread: false
            });

            renderNotifications();
        }

        function renderNotifications() {
            const list = document.getElementById('notifList');
            if (!list) return;

            const unreadCount = notifications.filter(n => n.unread).length;

            // Update the dot indicator on the bell
            const dot = document.getElementById('notifDot');
            if (dot) dot.style.display = unreadCount > 0 ? 'block' : 'none';
            // Also update bellBadge if it exists
            const badge = document.getElementById('bellBadge');
            if (badge) { badge.textContent = unreadCount; badge.classList.toggle('hidden', unreadCount === 0); }

            // Shake bell if new notifications
            if (unreadCount > 0) {
                const bell = document.getElementById('notifBell');
                if (bell) {
                    bell.classList.add('has-new');
                    setTimeout(() => bell.classList.remove('has-new'), 700);
                }
            }

            if (notifications.length === 0) {
                list.innerHTML = '<div class="notification-empty"><p>&#9749; No notifications yet</p><p style="font-size: 12px;">You\'re all caught up!</p></div>';
                return;
            }

            list.innerHTML = notifications.map(n => {
                const hasAction = !!n.action;
                return `
                <div class="notification-item ${n.unread ? 'unread' : ''}${hasAction ? ' notif-clickable' : ''}" onclick="handleNotifClick('${n.id}')">
                    <div class="notification-icon ${n.type}">${n.icon}</div>
                    <div class="notification-text">
                        <p>${n.text}</p>
                        <span class="notif-time">${getTimeAgo(n.time)}</span>
                    </div>
                </div>`;
            }).join('');
        }

        function toggleNotifications() {
            const panel = document.getElementById('notifPanel');
            const overlay = document.getElementById('notifOverlay');
            if (!panel || !overlay) return;
            const isOpen = panel.classList.contains('open');
            panel.classList.toggle('open');
            overlay.classList.toggle('open');
            // When opening: mark all as read locally and in DB
            if (!isOpen) {
                const unreadDbIds = notifications.filter(n => n.unread && n.dbId).map(n => n.dbId);
                notifications.forEach(n => { n.unread = false; });
                renderNotifications();
                if (unreadDbIds.length > 0 && currentUser) {
                    supabaseClient.from('notifications')
                        .update({ read: true })
                        .in('id', unreadDbIds)
                        .eq('user_id', currentUser.id)
                        .then(({ error }) => { if (error) console.error('mark notifs read:', error); });
                }
            }
        }

        function markNotificationRead(id) {
            const notif = notifications.find(n => n.id === id);
            if (notif) notif.unread = false;
            renderNotifications();
        }

        function handleNotifClick(id) {
            markNotificationRead(id);
            const notif = notifications.find(n => n.id === id);
            if (notif && notif.action) {
                notif.action();
                toggleNotifications();
            }
        }

        async function clearAllNotifications() {
            if (currentUser) {
                try {
                    await supabaseClient.from('notifications')
                        .delete().eq('user_id', currentUser.id).eq('read', true);
                } catch (e) { console.error('clearAllNotifications:', e); }
            }
            notifications = [];
            renderNotifications();
            showToast('Notifications cleared', 'info');
        }

        async function refreshBellBadge() {
            if (!currentUser) return;
            try {
                const { data } = await supabaseClient
                    .from('unread_notification_counts')
                    .select('unread_count')
                    .eq('user_id', currentUser.id)
                    .maybeSingle();
                const count = data ? (data.unread_count || 0) : 0;
                const badge = document.getElementById('bellBadge');
                if (badge) { badge.textContent = count; badge.classList.toggle('hidden', count === 0); }
                const dot = document.getElementById('notifDot');
                if (dot) dot.style.display = count > 0 ? 'block' : 'none';
            } catch (e) { console.error('refreshBellBadge:', e); }
        }

        // ============================================
        // GAMIFICATION - BADGES & STREAKS
        // ============================================

        const BADGES = [
            { id: 'first-sip', name: 'First Sip', icon: '&#9749;', desc: 'Complete your profile', check: () => getProfileCompletion().percentage >= 50 },
            { id: 'regular', name: 'Regular', icon: '&#128260;', desc: '3-day login streak', check: () => getLoginStreak() >= 3 },
            { id: 'connoisseur', name: 'Connoisseur', icon: '&#127942;', desc: '10+ connections', check: () => connections.length >= 10 },
            { id: 'connector', name: 'Connector', icon: '&#129309;', desc: 'Send 5+ messages', check: () => sentMessageCount >= 5 },
            { id: 'butterfly', name: 'Social Butterfly', icon: '&#129419;', desc: 'Join 3+ groups', check: () => myGroupIds.size >= 3 },
            { id: 'icebreaker', name: 'Icebreaker', icon: '&#129482;', desc: 'Use conversation starter', check: () => localStorage.getItem('usedIcebreaker') === 'true' },
            { id: 'profile-pro', name: 'Profile Pro', icon: '&#11088;', desc: '100% profile completion', check: () => getProfileCompletion().percentage === 100 }
        ];

        function checkBadges() {
            return BADGES.map(badge => ({
                ...badge,
                earned: badge.check()
            }));
        }

        function checkBadgesWithCelebration() {
            const key = `earnedBadges_${currentUser ? currentUser.id : 'guest'}`;
            const prev = JSON.parse(localStorage.getItem(key) || '[]');
            const badges = checkBadges();
            const newlyEarned = badges.filter(b => b.earned && !prev.includes(b.id));

            const allEarned = [...new Set([...prev, ...badges.filter(b => b.earned).map(b => b.id)])];
            localStorage.setItem(key, JSON.stringify(allEarned));

            if (newlyEarned.length > 0) {
                setTimeout(() => showBadgeEarned(newlyEarned[0]), 1000);
            }
        }

        function showBadgeEarned(badge) {
            showConfetti();
            const overlay = document.createElement('div');
            overlay.className = 'badge-toast-overlay';
            overlay.onclick = () => overlay.remove();
            overlay.innerHTML = `
                <div class="badge-toast-card">
                    <div class="big-badge">${badge.icon}</div>
                    <h2 style="color: var(--primary); margin-bottom: 0.5rem;">Badge Earned!</h2>
                    <h3 style="color: var(--accent); margin-bottom: 0.5rem;">${badge.name}</h3>
                    <p style="color: #999; font-size: 13px;">${badge.desc}</p>
                    <button class="btn btn-accent" onclick="this.closest('.badge-toast-overlay').remove()" style="margin-top: 1rem;">Awesome!</button>
                </div>
            `;
            document.body.appendChild(overlay);
            setTimeout(() => { if (overlay.parentNode) overlay.remove(); }, 5000);
        }

        function renderBadges(containerId) {
            const container = document.getElementById(containerId);
            if (!container) return;
            const badges = checkBadges();
            container.innerHTML = badges.map(b => `
                <div class="badge-item ${b.earned ? '' : 'locked'}">
                    <div class="badge-tooltip">${b.desc}</div>
                    <div class="badge-icon">${b.icon}</div>
                    <span class="badge-name">${b.name}</span>
                </div>
            `).join('');
        }

        function renderDashboardBadges() {
            renderBadges('dashboardBadges');
        }

        function recordLogin() {
            const history = JSON.parse(localStorage.getItem('loginHistory') || '[]');
            const today = new Date().toDateString();
            if (!history.includes(today)) {
                history.push(today);
                // Keep last 90 days only
                if (history.length > 90) history.shift();
                localStorage.setItem('loginHistory', JSON.stringify(history));
            }
        }

        function getLoginStreak() {
            const history = JSON.parse(localStorage.getItem('loginHistory') || '[]');
            if (history.length === 0) return 0;
            let streak = 1;
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // Check if logged in today
            if (!history.includes(today.toDateString())) return 0;

            for (let i = 1; i < 365; i++) {
                const checkDate = new Date(today);
                checkDate.setDate(checkDate.getDate() - i);
                if (history.includes(checkDate.toDateString())) {
                    streak++;
                } else {
                    break;
                }
            }
            return streak;
        }

        init();

        // ===================================================
        //  SETTINGS PAGE
        // ===================================================

        const stLoadedTabs = new Set();

        function setStBtnLoading(btn, loading) {
            if (!btn) return;
            if (loading) {
                btn.dataset.origText = btn.textContent;
                btn.textContent = 'Saving…';
                btn.disabled = true;
            } else {
                btn.textContent = btn.dataset.origText || 'Save';
                btn.disabled = false;
            }
        }

        function renderSettingsView() {
            if (!currentUser) return;
            stLoadedTabs.clear();

            // Avatar
            const avatarEl   = document.getElementById('stAvatarPreview');
            const initialsEl = document.getElementById('stAvatarInitials');
            if (currentUser.profilePicture) {
                if (initialsEl) initialsEl.style.display = 'none';
                let img = avatarEl ? avatarEl.querySelector('img') : null;
                if (!img) { img = document.createElement('img'); img.style.cssText = 'width:100%;height:100%;border-radius:50%;object-fit:cover;position:absolute;inset:0;'; if (avatarEl) avatarEl.insertBefore(img, avatarEl.firstChild); }
                img.src = currentUser.profilePicture;
            } else {
                if (initialsEl) { initialsEl.style.display = ''; initialsEl.textContent = ((currentUser.firstName||'?')[0]+(currentUser.lastName||'?')[0]).toUpperCase(); }
                if (avatarEl) { const img = avatarEl.querySelector('img'); if (img) img.remove(); }
            }
            const nameEl = document.getElementById('stAvatarName');
            const subEl  = document.getElementById('stAvatarSub');
            if (nameEl) nameEl.textContent = `${currentUser.firstName||''} ${currentUser.lastName||''}`.trim();
            if (subEl)  subEl.textContent  = [currentUser.role, currentUser.company].filter(Boolean).join(' · ') || 'Rowan University';

            // Account email
            const emailEl = document.getElementById('stCurrentEmail');
            if (emailEl) emailEl.value = currentUser.email || '';
            const verifiedEl = document.getElementById('stVerifiedEmail');
            if (verifiedEl) verifiedEl.textContent = currentUser.email || '—';

            // Handle URL hash tab, default to profile
            const validTabs = ['profile','account','notifications','privacy','availability','appearance','danger'];
            const hash = location.hash.replace('#settings-','');
            const targetTab = validTabs.includes(hash) ? hash : 'profile';
            switchStab(targetTab);

            loadStProfile();
        }

        async function loadStProfile() {
            if (!currentUser) return;
            try {
                const { data, error } = await supabaseClient.from('profiles').select('*').eq('id', currentUser.id).single();
                if (error) throw error;
                const fv = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
                fv('stFirstName', data.first_name);
                fv('stLastName',  data.last_name);
                fv('stHeadline',  data.headline);
                fv('stBio',       data.bio);
                fv('stStatus',    data.status);
                fv('stGradYear',  data.grad_year);
                fv('stMajor',     data.major);
                fv('stIndustry',  data.industry);
                fv('stRole',      data.role);
                fv('stCompany',   data.company);
                fv('stLocation',  data.location);
                fv('stLinkedin',  data.linkedin_url);
                fv('stGoals',     data.goals);
                // Banner preview
                const bannerPrev = document.getElementById('stBannerPreview');
                const bannerRemoveBtn = document.getElementById('stBannerRemoveBtn');
                if (bannerPrev) {
                    bannerPrev.style.backgroundImage = data.banner_image ? `url('${data.banner_image}')` : '';
                    if (bannerRemoveBtn) bannerRemoveBtn.style.display = data.banner_image ? '' : 'none';
                }
                currentUser.bannerImage = data.banner_image || null;
                // Resume hint
                const resumeHint = document.getElementById('stResumeHint');
                if (resumeHint) resumeHint.textContent = data.resume_url ? 'Resume uploaded ✓' : '';
                // Interests tags
                renderStTagsWrap('stInterestTags', 'stInterestInput', data.interests || []);
                // Hobbies tags
                renderStTagsWrap('stHobbyTags', 'stHobbyInput', data.hobbies || []);
                // Achievements (separate table — loaded independently)
                loadAchievements();
                // Update global cache
                currentUser.firstName     = data.first_name;
                currentUser.lastName      = data.last_name;
                currentUser.headline      = data.headline;
                currentUser.bio           = data.bio;
                currentUser.status        = data.status;
                currentUser.gradYear      = data.grad_year;
                currentUser.major         = data.major;
                currentUser.industry      = data.industry;
                currentUser.role          = data.role;
                currentUser.company       = data.company;
                currentUser.location      = data.location;
                currentUser.linkedinUrl   = data.linkedin_url;
                currentUser.goals         = data.goals;
                currentUser.interests     = data.interests || [];
                currentUser.hobbies       = data.hobbies   || [];
                currentUser.achievements  = Array.isArray(data.achievements) ? data.achievements : [];
            } catch (e) { console.error('loadStProfile error:', e); }
        }

        function renderStTagsWrap(wrapperId, inputId, tags) {
            const wrap  = document.getElementById(wrapperId);
            const input = document.getElementById(inputId);
            if (!wrap || !input) return;
            wrap.innerHTML = '';
            tags.forEach(tag => {
                const chip = document.createElement('span');
                chip.className = 'st-tag-chip';
                chip.innerHTML = `${tag} <button onclick="removeStTag(this)" type="button">×</button>`;
                wrap.appendChild(chip);
            });
            wrap.appendChild(input);
        }

        function applyTheme(theme) {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            const isDark = theme === 'dark' || (theme === 'system' && prefersDark);
            document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
            localStorage.setItem('app_theme', theme);
        }

        function selectThemeOption(el, value) {
            document.querySelectorAll('.st-theme-option').forEach(o => o.classList.remove('active'));
            el.classList.add('active');
            const radio = el.closest('label').querySelector('input[type=radio]');
            if (radio) radio.checked = true;
            applyTheme(value);
        }

        function loadStAppearance() {
            const theme = localStorage.getItem('app_theme') || 'light';
            document.querySelectorAll('input[name="st_theme"]').forEach(input => {
                const isMatch = input.value === theme;
                input.checked = isMatch;
                const optDiv = input.closest('label') && input.closest('label').querySelector('.st-theme-option');
                if (optDiv) optDiv.classList.toggle('active', isMatch);
            });
        }

        const ST_TABS = ['profile','account','notifications','privacy','availability','appearance','danger'];

        function switchStab(tab) {
            // Update nav active state
            document.querySelectorAll('.snav-item').forEach(function(el) { el.classList.remove('active'); });
            var activeNav = document.getElementById('stab-' + tab);
            if (activeNav) activeNav.classList.add('active');

            // Show/hide sections — use inline style to override inline display:none defaults
            document.querySelectorAll('.settings-section').forEach(function(el) {
                el.classList.remove('active');
                el.style.display = 'none';
            });
            var activeSection = document.getElementById('section-' + tab);
            if (activeSection) {
                activeSection.classList.add('active');
                activeSection.style.display = 'flex';
            }

            if (typeof loadSettingsTab === 'function') loadSettingsTab(tab);
        }

        function switchSettingsTab(tabName) {
            // Update nav active state
            document.querySelectorAll('.snav-item').forEach(el => el.classList.remove('active'));
            const navItem = document.querySelector(`.snav-item[data-tab="${tabName}"]`);
            if (navItem) navItem.classList.add('active');

            // Mobile tabs
            document.querySelectorAll('.st-mobile-tab').forEach(btn => {
                btn.classList.toggle('active', (btn.getAttribute('onclick') || '').includes(`'${tabName}'`));
            });

            // Show/hide sections with direct style to bypass any CSS conflicts
            ST_TABS.forEach(name => {
                const el = document.getElementById('section-' + name);
                if (el) el.style.display = (name === tabName) ? 'flex' : 'none';
            });

            // Update URL hash
            if (tabName !== 'profile') history.replaceState(null, '', `#settings-${tabName}`);
            else history.replaceState(null, '', location.pathname);

            // Lazy-load data for this tab
            loadSettingsTab(tabName);
        }

        function loadSettingsTab(tabName) {
            if (stLoadedTabs.has(tabName)) return;
            stLoadedTabs.add(tabName);
            if (tabName === 'notifications') loadStNotifications();
            if (tabName === 'privacy')       loadStPrivacy();
            if (tabName === 'availability')  loadStAvailability();
            if (tabName === 'danger')        loadStDanger();
            if (tabName === 'appearance')    loadStAppearance();
        }

        async function saveStProfile() {
            if (!currentUser) return;
            const btn = document.getElementById('stSaveBasicBtn');
            setStBtnLoading(btn, true);
            const firstName = document.getElementById('stFirstName').value.trim();
            const lastName  = document.getElementById('stLastName').value.trim();
            const headline  = document.getElementById('stHeadline').value.trim();
            const bio       = document.getElementById('stBio').value.trim();
            const status    = document.getElementById('stStatus').value;
            const gradYear  = document.getElementById('stGradYear').value;
            if (!firstName || !lastName) { showStToast('Please enter your name.', 'error'); setStBtnLoading(btn, false); return; }
            try {
                const { error } = await supabaseClient.from('profiles').update({
                    first_name: firstName, last_name: lastName, headline, bio, status, grad_year: gradYear
                }).eq('id', currentUser.id);
                if (error) throw error;
                currentUser.firstName = firstName; currentUser.lastName = lastName;
                currentUser.headline  = headline;  currentUser.bio      = bio;
                currentUser.status    = status;    currentUser.gradYear = gradYear;
                showStToast('Profile saved!');
            } catch (e) { showStToast('Error: ' + e.message, 'error'); }
            setStBtnLoading(btn, false);
        }

        async function saveStCareer() {
            if (!currentUser) return;
            const btn = document.getElementById('stSaveCareerBtn');
            setStBtnLoading(btn, true);
            const major    = document.getElementById('stMajor').value.trim();
            const industry = document.getElementById('stIndustry').value;
            const role     = document.getElementById('stRole').value.trim();
            const company  = document.getElementById('stCompany').value.trim();
            const location = document.getElementById('stLocation').value.trim();
            const linkedin = document.getElementById('stLinkedin').value.trim();
            const goals    = document.getElementById('stGoals').value.trim();
            const interests = Array.from(document.querySelectorAll('#stInterestTags .st-tag-chip')).map(c => c.firstChild.textContent.trim());
            const hobbies   = Array.from(document.querySelectorAll('#stHobbyTags .st-tag-chip')).map(c => c.firstChild.textContent.trim());
            try {
                const { error } = await supabaseClient.from('profiles').update({
                    major, industry, role, company, location, linkedin_url: linkedin, goals, interests, hobbies
                }).eq('id', currentUser.id);
                if (error) throw error;
                currentUser.major = major; currentUser.industry = industry; currentUser.role = role;
                currentUser.company = company; currentUser.location = location;
                currentUser.linkedinUrl = linkedin; currentUser.goals = goals;
                currentUser.interests = interests; currentUser.hobbies = hobbies;
                showStToast('Career info saved!');
            } catch (e) { showStToast('Error: ' + e.message, 'error'); }
            setStBtnLoading(btn, false);
        }

        // ─── ACHIEVEMENTS (achievements table) ───
        const ACH_TYPE_OPTIONS = [
            { value: 'internship', label: '💼 Internship' },
            { value: 'club',       label: '🎓 Club / Org' },
            { value: 'exam',       label: '📜 Exam / Certification' },
            { value: 'award',      label: '🏆 Award' },
            { value: 'volunteer',  label: '🤝 Volunteer' },
            { value: 'project',    label: '💡 Project' },
            { value: 'other',      label: '⭐ Other' },
        ];
        const ACH_TYPE_ICON = {
            internship:'💼', club:'🎓', exam:'📜',
            award:'🏆', volunteer:'🤝', project:'💡', other:'⭐'
        };
        let _achList = [];
        let _achEditing = null;

        function _achEsc(str) {
            return String(str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
        }

        function _fmtAchDate(start, end, isCurrent) {
            const fmt = d => {
                if (!d) return null;
                return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
            };
            const s = fmt(start);
            if (!s) return null;
            if (isCurrent) return `${s} – Present`;
            const e = fmt(end);
            return e ? `${s} – ${e}` : s;
        }

        async function loadAchievements() {
            const container = document.getElementById('stAchievementsList');
            if (!container) return;
            container.innerHTML = '<p style="font-size:13px;color:var(--muted);padding:4px 0;">Loading…</p>';
            try {
                const { data, error } = await supabaseClient
                    .from('achievements')
                    .select('*')
                    .eq('user_id', currentUser.id)
                    .order('display_order');
                if (error) throw error;
                _achList = data || [];
                renderAchCards();
            } catch (e) {
                if (container) container.innerHTML = `<p style="font-size:13px;color:#e55;">Error: ${e.message}</p>`;
            }
        }

        function renderAchCards() {
            const container = document.getElementById('stAchievementsList');
            if (!container) return;
            if (_achList.length === 0) {
                container.innerHTML = '<p style="font-size:13px;color:var(--muted);opacity:.7;padding:4px 0 10px;">No achievements yet. Add your first one below.</p>';
                return;
            }
            container.innerHTML = _achList.map(a => {
                const icon = ACH_TYPE_ICON[a.type] || '⭐';
                const dateStr = _fmtAchDate(a.start_date, a.end_date, a.is_current);
                return `
                <div class="ach-card" data-id="${a.id}">
                    <div class="ach-card-icon">${icon}</div>
                    <div class="ach-card-body">
                        <div class="ach-card-title">${_achEsc(a.title)}</div>
                        ${a.organization ? `<div class="ach-card-org">${_achEsc(a.organization)}</div>` : ''}
                        ${dateStr ? `<div class="ach-card-date">${dateStr}</div>` : ''}
                        ${a.description ? `<div class="ach-card-desc">${_achEsc(a.description)}</div>` : ''}
                    </div>
                    <div class="ach-card-btns">
                        <button class="ach-icon-btn" onclick="openAchEdit('${a.id}')" title="Edit">✏️</button>
                        <button class="ach-icon-btn ach-danger" onclick="deleteAch('${a.id}')" title="Delete">🗑️</button>
                    </div>
                </div>`;
            }).join('');
        }

        function openAchForm(prefill) {
            _achEditing = prefill ? prefill.id : null;
            const form   = document.getElementById('achInlineForm');
            const addBtn = document.getElementById('achAddBtn');
            if (!form) return;
            if (addBtn) addBtn.style.display = 'none';
            const typeOpts = ACH_TYPE_OPTIONS.map(o =>
                `<option value="${o.value}" ${prefill && prefill.type === o.value ? 'selected' : ''}>${o.label}</option>`
            ).join('');
            form.innerHTML = `
                <div class="ach-form">
                    <div class="ach-form-title">${prefill ? 'Edit Achievement' : 'New Achievement'}</div>
                    <div class="ach-form-grid">
                        <div class="st-form-group ach-full">
                            <label class="st-label">Type</label>
                            <select id="achFType" class="st-input">${typeOpts}</select>
                        </div>
                        <div class="st-form-group">
                            <label class="st-label">Title</label>
                            <input id="achFTitle" class="st-input" type="text" placeholder="e.g. Marketing Intern" value="${prefill ? _achEsc(prefill.title) : ''}">
                        </div>
                        <div class="st-form-group">
                            <label class="st-label">Organization</label>
                            <input id="achFOrg" class="st-input" type="text" placeholder="e.g. KPMG" value="${prefill ? _achEsc(prefill.organization) : ''}">
                        </div>
                        <div class="st-form-group">
                            <label class="st-label">Start Date</label>
                            <input id="achFStart" class="st-input" type="month" value="${prefill && prefill.start_date ? prefill.start_date.slice(0,7) : ''}">
                        </div>
                        <div class="st-form-group">
                            <label class="st-label">End Date</label>
                            <input id="achFEnd" class="st-input" type="month"
                                value="${prefill && prefill.end_date ? prefill.end_date.slice(0,7) : ''}"
                                ${prefill && prefill.is_current ? 'disabled' : ''}>
                        </div>
                        <div class="ach-current-row ach-full">
                            <input type="checkbox" id="achFCurrent"
                                ${prefill && prefill.is_current ? 'checked' : ''}
                                onchange="document.getElementById('achFEnd').disabled=this.checked">
                            <label for="achFCurrent">Currently active / ongoing</label>
                        </div>
                        <div class="st-form-group ach-full">
                            <label class="st-label">Description <span style="font-weight:400;opacity:.6;">(optional)</span></label>
                            <textarea id="achFDesc" class="st-input" style="min-height:60px;" placeholder="Short summary…">${prefill ? _achEsc(prefill.description) : ''}</textarea>
                        </div>
                    </div>
                    <div class="ach-form-btns">
                        <button class="st-btn-secondary" onclick="closeAchForm()">Cancel</button>
                        <button class="st-btn-primary" id="achFSaveBtn" onclick="saveAch()">${prefill ? 'Update' : 'Add'}</button>
                    </div>
                </div>`;
            form.style.display = 'block';
        }

        function openAchEdit(id) {
            const a = _achList.find(x => x.id === id);
            if (a) openAchForm(a);
        }

        function closeAchForm() {
            _achEditing = null;
            const form   = document.getElementById('achInlineForm');
            const addBtn = document.getElementById('achAddBtn');
            if (form) { form.innerHTML = ''; form.style.display = 'none'; }
            if (addBtn) addBtn.style.display = '';
        }

        async function saveAch() {
            const btn = document.getElementById('achFSaveBtn');
            if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }
            const typeVal   = document.getElementById('achFType').value;
            const titleVal  = document.getElementById('achFTitle').value.trim();
            const orgVal    = document.getElementById('achFOrg').value.trim();
            const descVal   = document.getElementById('achFDesc').value.trim();
            const isCurrent = document.getElementById('achFCurrent').checked;
            const startRaw  = document.getElementById('achFStart').value;
            const endRaw    = document.getElementById('achFEnd').value;
            const startDate = startRaw ? startRaw + '-01' : null;
            const endDate   = (!isCurrent && endRaw) ? endRaw + '-01' : null;
            if (!titleVal) {
                sShowToast('Please enter a title.');
                if (btn) { btn.disabled = false; btn.textContent = _achEditing ? 'Update' : 'Add'; }
                return;
            }
            try {
                if (_achEditing) {
                    const { error } = await supabaseClient.from('achievements')
                        .update({ type: typeVal, title: titleVal, organization: orgVal,
                                  description: descVal, start_date: startDate,
                                  end_date: endDate, is_current: isCurrent })
                        .eq('id', _achEditing);
                    if (error) throw error;
                    const idx = _achList.findIndex(x => x.id === _achEditing);
                    if (idx !== -1) _achList[idx] = { ..._achList[idx], type: typeVal, title: titleVal,
                        organization: orgVal, description: descVal,
                        start_date: startDate, end_date: endDate, is_current: isCurrent };
                    sShowToast('✓ Achievement updated');
                } else {
                    const { data, error } = await supabaseClient.from('achievements').insert({
                        user_id: currentUser.id,
                        type: typeVal, title: titleVal, organization: orgVal,
                        description: descVal, start_date: startDate,
                        end_date: endDate, is_current: isCurrent,
                        display_order: _achList.length
                    }).select().single();
                    if (error) throw error;
                    if (data) _achList.push(data);
                    sShowToast('✓ Achievement added');
                }
                closeAchForm();
                renderAchCards();
            } catch (e) {
                sShowToast('❌ Error: ' + e.message);
                if (btn) { btn.disabled = false; btn.textContent = _achEditing ? 'Update' : 'Add'; }
            }
        }

        async function deleteAch(id) {
            if (!confirm('Delete this achievement?')) return;
            try {
                const { error } = await supabaseClient.from('achievements').delete().eq('id', id);
                if (error) throw error;
                _achList = _achList.filter(x => x.id !== id);
                renderAchCards();
                sShowToast('✓ Achievement deleted');
            } catch (e) { sShowToast('❌ Error: ' + e.message); }
        }
        // ─── END ACHIEVEMENTS (achievements table) ───

        async function saveStEmail() {
            const newEmail = document.getElementById('stNewEmail').value.trim();
            if (!newEmail) { showStToast('Please enter a new email.', 'error'); return; }
            try {
                const { error } = await supabaseClient.auth.updateUser({ email: newEmail });
                if (error) throw error;
                showStToast('Confirmation sent — check your inbox!');
                document.getElementById('stNewEmail').value = '';
            } catch (e) { showStToast('Error: ' + e.message, 'error'); }
        }

        async function saveStPassword() {
            const pw  = document.getElementById('stNewPassword').value;
            const pw2 = document.getElementById('stConfirmPassword').value;
            if (!pw || pw.length < 8) { showStToast('Password must be at least 8 characters.', 'error'); return; }
            if (pw !== pw2) { showStToast('Passwords do not match.', 'error'); return; }
            try {
                const { error } = await supabaseClient.auth.updateUser({ password: pw });
                if (error) throw error;
                document.getElementById('stNewPassword').value = '';
                document.getElementById('stConfirmPassword').value = '';
                showStToast('Password updated!');
            } catch (e) { showStToast('Error: ' + e.message, 'error'); }
        }

        // ── Notifications ──
        async function loadStNotifications() {
            if (!currentUser) return;
            try {
                const { data, error } = await supabaseClient.from('user_preferences').select('*').eq('user_id', currentUser.id).maybeSingle();
                if (error) throw error;
                if (!data) return;
                const toggle = (id, val) => { const el = document.getElementById(id); if (el) el.checked = !!val; };
                toggle('notif_email_connections',     data.notif_email_connections);
                toggle('notif_email_chat_requests',   data.notif_email_chat_requests);
                toggle('notif_email_reminders',       data.notif_email_reminders);
                toggle('notif_email_messages',        data.notif_email_messages);
                toggle('notif_email_group_activity',  data.notif_email_group_activity);
                toggle('notif_email_weekly_digest',   data.notif_email_weekly_digest);
                toggle('notif_app_connection_accepted', data.notif_app_connection_accepted);
                toggle('notif_app_match_suggestions',   data.notif_app_match_suggestions);
                toggle('notif_app_chat_reviews',        data.notif_app_chat_reviews);
            } catch (e) { console.error('loadStNotifications error:', e); }
        }

        async function saveStNotifications() {
            if (!currentUser) return;
            const activeBtn = document.activeElement;
            const btn = document.getElementById('stSaveNotifBtn') || document.getElementById('stSaveInAppBtn');
            setStBtnLoading(activeBtn?.id?.startsWith('stSave') ? activeBtn : btn, true);
            const cv = id => { const el = document.getElementById(id); return el ? el.checked : false; };
            const payload = {
                notif_email_connections:      cv('notif_email_connections'),
                notif_email_chat_requests:    cv('notif_email_chat_requests'),
                notif_email_reminders:        cv('notif_email_reminders'),
                notif_email_messages:         cv('notif_email_messages'),
                notif_email_group_activity:   cv('notif_email_group_activity'),
                notif_email_weekly_digest:    cv('notif_email_weekly_digest'),
                notif_app_connection_accepted: cv('notif_app_connection_accepted'),
                notif_app_match_suggestions:   cv('notif_app_match_suggestions'),
                notif_app_chat_reviews:        cv('notif_app_chat_reviews'),
            };
            try {
                const { error } = await supabaseClient.from('user_preferences').update(payload).eq('user_id', currentUser.id);
                if (error) throw error;
                showStToast('Notification preferences saved!');
            } catch (e) { showStToast('Error: ' + e.message, 'error'); }
            setStBtnLoading(activeBtn?.id?.startsWith('stSave') ? activeBtn : btn, false);
        }

        // ── Privacy ──
        async function loadStPrivacy() {
            if (!currentUser) return;
            try {
                const { data, error } = await supabaseClient.from('user_preferences').select('*').eq('user_id', currentUser.id).maybeSingle();
                if (error) throw error;
                if (!data) return;
                const sv = (id, val) => { const el = document.getElementById(id); if (el && val) el.value = val; };
                const toggle = (id, val) => { const el = document.getElementById(id); if (el) el.checked = !!val; };
                sv('privacy_profile_visibility',  data.privacy_profile_visibility);
                sv('privacy_who_can_connect',     data.privacy_who_can_connect);
                sv('privacy_who_can_chat',        data.privacy_who_can_chat);
                sv('privacy_show_online_status',  data.privacy_show_online_status);
                toggle('privacy_appear_in_discover',    data.privacy_appear_in_discover);
                toggle('privacy_show_match_percent',    data.privacy_show_match_percent);
                toggle('privacy_alumni_recommendations', data.privacy_alumni_recommendations);
            } catch (e) { console.error('loadStPrivacy error:', e); }
        }

        async function saveStPrivacy() {
            if (!currentUser) return;
            const activeBtn = document.activeElement;
            setStBtnLoading(activeBtn, true);
            const sv = id => { const el = document.getElementById(id); return el ? el.value : null; };
            const cv = id => { const el = document.getElementById(id); return el ? el.checked : false; };
            const payload = {
                privacy_profile_visibility:    sv('privacy_profile_visibility'),
                privacy_who_can_connect:       sv('privacy_who_can_connect'),
                privacy_who_can_chat:          sv('privacy_who_can_chat'),
                privacy_show_online_status:    sv('privacy_show_online_status'),
                privacy_appear_in_discover:    cv('privacy_appear_in_discover'),
                privacy_show_match_percent:    cv('privacy_show_match_percent'),
                privacy_alumni_recommendations: cv('privacy_alumni_recommendations'),
            };
            try {
                const { error } = await supabaseClient.from('user_preferences').update(payload).eq('user_id', currentUser.id);
                if (error) throw error;
                showStToast('Privacy settings saved!');
            } catch (e) { showStToast('Error: ' + e.message, 'error'); }
            setStBtnLoading(activeBtn, false);
        }

        // ── Availability ──
        function toggleAvailDay(dayNum) {
            const on    = document.getElementById(`avail-on-${dayNum}`);
            const start = document.getElementById(`avail-start-${dayNum}`);
            const end   = document.getElementById(`avail-end-${dayNum}`);
            if (!on || !start || !end) return;
            start.disabled = !on.checked;
            end.disabled   = !on.checked;
        }

        async function loadStAvailability() {
            if (!currentUser) return;
            try {
                const [availRes, prefsRes] = await Promise.all([
                    supabaseClient.from('availability').select('*').eq('user_id', currentUser.id),
                    supabaseClient.from('user_preferences').select('pref_open_virtual,pref_open_inperson,pref_weekly_chat_limit').eq('user_id', currentUser.id).maybeSingle()
                ]);
                if (availRes.error) throw availRes.error;
                // Reset all days
                for (let d = 0; d < 7; d++) {
                    const on    = document.getElementById(`avail-on-${d}`);
                    const start = document.getElementById(`avail-start-${d}`);
                    const end   = document.getElementById(`avail-end-${d}`);
                    if (on)    on.checked    = false;
                    if (start) { start.value = '09:00'; start.disabled = true; }
                    if (end)   { end.value   = '17:00'; end.disabled   = true; }
                }
                // Apply saved data
                (availRes.data || []).forEach(slot => {
                    const d = slot.day_of_week;
                    const on    = document.getElementById(`avail-on-${d}`);
                    const start = document.getElementById(`avail-start-${d}`);
                    const end   = document.getElementById(`avail-end-${d}`);
                    if (on && slot.is_available) { on.checked = true; }
                    if (start) { start.value = (slot.start_time || '09:00').substring(0,5); start.disabled = !on?.checked; }
                    if (end)   { end.value   = (slot.end_time   || '17:00').substring(0,5); end.disabled   = !on?.checked; }
                });
                // Chat prefs
                if (prefsRes.data) {
                    const p = prefsRes.data;
                    const tv = (id, val) => { const el = document.getElementById(id); if (el) el.checked = !!val; };
                    tv('pref_open_virtual',     p.pref_open_virtual);
                    tv('pref_open_inperson',    p.pref_open_inperson);
                    tv('pref_weekly_chat_limit', p.pref_weekly_chat_limit);
                }
            } catch (e) { console.error('loadStAvailability error:', e); }
        }

        async function saveStAvailability() {
            if (!currentUser) return;
            const btn = document.getElementById('stSaveAvailBtn');
            setStBtnLoading(btn, true);
            try {
                const rows = [];
                for (let d = 0; d < 7; d++) {
                    const on    = document.getElementById(`avail-on-${d}`);
                    const start = document.getElementById(`avail-start-${d}`);
                    const end   = document.getElementById(`avail-end-${d}`);
                    if (!on) continue;
                    rows.push({
                        user_id:     currentUser.id,
                        day_of_week: d,
                        is_available: on.checked,
                        start_time:  start ? start.value : '09:00',
                        end_time:    end   ? end.value   : '17:00'
                    });
                }
                const { error } = await supabaseClient.from('availability').upsert(rows, { onConflict: 'user_id,day_of_week' });
                if (error) throw error;
                showStToast('Availability saved!');
            } catch (e) { showStToast('Error: ' + e.message, 'error'); }
            setStBtnLoading(btn, false);
        }

        async function saveStChatPrefs() {
            if (!currentUser) return;
            const btn = document.getElementById('stSaveChatPrefsBtn');
            setStBtnLoading(btn, true);
            const cv = id => { const el = document.getElementById(id); return el ? el.checked : false; };
            try {
                const { error } = await supabaseClient.from('user_preferences').update({
                    pref_open_virtual:      cv('pref_open_virtual'),
                    pref_open_inperson:     cv('pref_open_inperson'),
                    pref_weekly_chat_limit: cv('pref_weekly_chat_limit')
                }).eq('user_id', currentUser.id);
                if (error) throw error;
                showStToast('Chat preferences saved!');
            } catch (e) { showStToast('Error: ' + e.message, 'error'); }
            setStBtnLoading(btn, false);
        }

        // ── Avatar / Resume upload ──
        async function uploadStAvatar(input) {
            if (!input.files || !input.files[0] || !currentUser) return;
            const file = input.files[0];
            if (file.size > 5 * 1024 * 1024) { showStToast('Image must be under 5 MB.', 'error'); return; }
            try {
                const ext  = file.name.split('.').pop().toLowerCase();
                const path = `${currentUser.id}/avatar.${ext}`;
                const { error: upErr } = await supabaseClient.storage.from('avatars').upload(path, file, { upsert: true });
                if (upErr) throw upErr;
                const { data: urlData } = supabaseClient.storage.from('avatars').getPublicUrl(path);
                const publicUrl = urlData.publicUrl + '?t=' + Date.now();
                await supabaseClient.from('profiles').update({ profile_picture: urlData.publicUrl }).eq('id', currentUser.id);
                currentUser.profilePicture = publicUrl;
                // Update preview
                const avatarEl   = document.getElementById('stAvatarPreview');
                const initialsEl = document.getElementById('stAvatarInitials');
                if (initialsEl) initialsEl.style.display = 'none';
                let img = avatarEl ? avatarEl.querySelector('img') : null;
                if (!img) { img = document.createElement('img'); img.style.cssText = 'width:100%;height:100%;border-radius:50%;object-fit:cover;position:absolute;inset:0;'; if (avatarEl) avatarEl.insertBefore(img, avatarEl.firstChild); }
                img.src = publicUrl;
                showStToast('Photo updated!');
            } catch (e) { showStToast('Upload failed: ' + e.message, 'error'); }
        }

        async function uploadStBanner(input) {
            if (!input.files || !input.files[0] || !currentUser) return;
            const file = input.files[0];
            if (file.size > 5 * 1024 * 1024) { showStToast('Image must be under 5 MB.', 'error'); return; }
            try {
                const ext  = file.name.split('.').pop().toLowerCase();
                const path = `${currentUser.id}/banner.${ext}`;
                const { error: upErr } = await supabaseClient.storage.from('banners').upload(path, file, { upsert: true });
                if (upErr) throw upErr;
                const { data: urlData } = supabaseClient.storage.from('banners').getPublicUrl(path);
                const publicUrl = urlData.publicUrl + '?t=' + Date.now();
                await supabaseClient.from('profiles').update({ banner_image: urlData.publicUrl }).eq('id', currentUser.id);
                currentUser.bannerImage = publicUrl;
                const preview = document.getElementById('stBannerPreview');
                if (preview) {
                    preview.style.backgroundImage = `url('${publicUrl}')`;
                    const overlay = document.getElementById('stBannerOverlay');
                    if (overlay) overlay.style.opacity = '0';
                }
                const removeBtn = document.getElementById('stBannerRemoveBtn');
                if (removeBtn) removeBtn.style.display = '';
                showStToast('Cover photo updated!');
            } catch (e) { showStToast('Upload failed: ' + e.message, 'error'); }
        }

        async function removeStBanner() {
            if (!currentUser) return;
            try {
                await supabaseClient.from('profiles').update({ banner_image: null }).eq('id', currentUser.id);
                currentUser.bannerImage = null;
                const preview = document.getElementById('stBannerPreview');
                if (preview) preview.style.backgroundImage = '';
                const removeBtn = document.getElementById('stBannerRemoveBtn');
                if (removeBtn) removeBtn.style.display = 'none';
                showStToast('Cover photo removed.');
            } catch (e) { showStToast('Failed to remove: ' + e.message, 'error'); }
        }

        // Called from the edit button on the banner in viewProfile (own profile)
        async function uploadPvBanner(input) {
            if (!input.files || !input.files[0] || !currentUser) return;
            const file = input.files[0];
            if (file.size > 5 * 1024 * 1024) { alert('Image must be under 5 MB.'); return; }
            try {
                const ext  = file.name.split('.').pop().toLowerCase();
                const path = `${currentUser.id}/banner.${ext}`;
                const { error: upErr } = await supabaseClient.storage.from('banners').upload(path, file, { upsert: true });
                if (upErr) throw upErr;
                const { data: urlData } = supabaseClient.storage.from('banners').getPublicUrl(path);
                const publicUrl = urlData.publicUrl + '?t=' + Date.now();
                await supabaseClient.from('profiles').update({ banner_image: urlData.publicUrl }).eq('id', currentUser.id);
                currentUser.bannerImage = publicUrl;
                // Refresh the banner in the current view
                const banner = document.querySelector('#profileDetailContent .pv-banner');
                if (banner) {
                    banner.style.backgroundImage = `url('${publicUrl}')`;
                    banner.classList.add('has-image');
                }
            } catch (e) { alert('Upload failed: ' + e.message); }
        }

        async function uploadStResume(input) {
            if (!input.files || !input.files[0] || !currentUser) return;
            const file = input.files[0];
            if (file.size > 10 * 1024 * 1024) { showStToast('Resume must be under 10 MB.', 'error'); return; }
            try {
                const path = `${currentUser.id}/resume.pdf`;
                const { error: upErr } = await supabaseClient.storage.from('resumes').upload(path, file, { upsert: true, contentType: 'application/pdf' });
                if (upErr) throw upErr;
                await supabaseClient.from('profiles').update({ resume_url: path }).eq('id', currentUser.id);
                currentUser.resume = path;
                const hint = document.getElementById('stResumeHint');
                if (hint) hint.textContent = 'Resume uploaded ✓';
                showStToast('Resume uploaded!');
            } catch (e) { showStToast('Upload failed: ' + e.message, 'error'); }
        }

        // ── Tag inputs ──
        function handleStTag(event, wrapperId, inputId) {
            if (event.key !== 'Enter' && event.key !== ',') return;
            event.preventDefault();
            const input = document.getElementById(inputId);
            const val   = input.value.replace(',','').trim();
            if (!val) return;
            const wrap = document.getElementById(wrapperId);
            const chip = document.createElement('span');
            chip.className = 'st-tag-chip';
            chip.innerHTML = `${val} <button onclick="removeStTag(this)" type="button">×</button>`;
            wrap.insertBefore(chip, input);
            input.value = '';
        }

        function removeStTag(btn) {
            btn.closest('.st-tag-chip').remove();
        }

        // ── Danger Zone ──
        function exportStData() {
            showStToast('Data export coming soon — we\'ll email you a download link!');
        }

        async function loadStDanger() {
            if (!currentUser) return;
            try {
                const { data } = await supabaseClient.from('user_preferences')
                    .select('privacy_appear_in_discover').eq('user_id', currentUser.id).maybeSingle();
                const isPaused = data && data.privacy_appear_in_discover === false;
                const btn = document.getElementById('stPauseBtn');
                if (btn) {
                    btn.textContent = isPaused ? 'Resume Account' : 'Pause Account';
                    btn.onclick = isPaused ? resumeStAccount : pauseStAccount;
                }
            } catch (e) { console.error('loadStDanger:', e); }
        }

        async function pauseStAccount() {
            if (!currentUser) return;
            try {
                const { error } = await supabaseClient.from('user_preferences').update({ privacy_appear_in_discover: false }).eq('user_id', currentUser.id);
                if (error) throw error;
                showStToast('Your profile is now hidden from Discover.');
                const btn = document.getElementById('stPauseBtn');
                if (btn) { btn.textContent = 'Resume Account'; btn.onclick = resumeStAccount; }
                const el = document.getElementById('privacy_appear_in_discover');
                if (el) el.checked = false;
            } catch (e) { showStToast('Error: ' + e.message, 'error'); }
        }

        async function resumeStAccount() {
            if (!currentUser) return;
            try {
                const { error } = await supabaseClient.from('user_preferences').update({ privacy_appear_in_discover: true }).eq('user_id', currentUser.id);
                if (error) throw error;
                showStToast('Account resumed — your profile is visible in Discover.');
                const btn = document.getElementById('stPauseBtn');
                if (btn) { btn.textContent = 'Pause Account'; btn.onclick = pauseStAccount; }
                const el = document.getElementById('privacy_appear_in_discover');
                if (el) el.checked = true;
            } catch (e) { showStToast('Error: ' + e.message, 'error'); }
        }

        async function clearAllNotifsDanger() {
            if (!currentUser) return;
            if (!confirm('Delete all notifications? This cannot be undone.')) return;
            try {
                const { error } = await supabaseClient.from('notifications').delete().eq('user_id', currentUser.id);
                if (error) throw error;
                notifications = notifications.filter(n => !n.dbId);
                renderNotifications();
                showStToast('All notifications cleared.');
            } catch (e) { showStToast('Error: ' + e.message, 'error'); }
        }

        async function signOutOtherDevices() {
            try {
                const { error } = await supabaseClient.auth.signOut({ scope: 'others' });
                if (error) throw error;
                showStToast('Signed out of all other devices.');
            } catch (e) { showStToast('Error: ' + e.message, 'error'); }
        }

        async function signOutAllDevices() {
            try {
                const { error } = await supabaseClient.auth.signOut({ scope: 'global' });
                if (error) throw error;
                location.reload();
            } catch (e) { showStToast('Error: ' + e.message, 'error'); }
        }

        function checkDeleteInput() {
            const input = document.getElementById('stDeleteConfirmInput');
            const btn   = document.getElementById('stDeleteAccountBtn');
            if (!input || !btn) return;
            const ready = input.value === 'DELETE';
            btn.disabled = !ready;
            btn.style.opacity = ready ? '1' : '0.4';
        }

        function confirmDeleteAccount() {
            showStToast('To delete your account, email sal@firstsipapp.com — we\'ll process it within 24 hours.');
        }

        let stToastTimer = null;
        function showStToast(msg, type) {
            const toast = document.getElementById('stToast');
            if (!toast) return;
            toast.textContent = (type === 'error' ? '✕ ' : '✓ ') + msg;
            toast.classList.toggle('error', type === 'error');
            toast.classList.add('show');
            if (stToastTimer) clearTimeout(stToastTimer);
            stToastTimer = setTimeout(() => toast.classList.remove('show'), 3500);
        }

        /* ══════════════════════════════════════════════
           NEW SETTINGS PAGE — sNav / sSaveProfile etc.
           ══════════════════════════════════════════════ */
        const sTags = { interests: [], hobbies: [] };
        let sProfileLoaded = false;

        function sNav(tab) {
            const tabs = ['profile','account','notifications','privacy','availability','appearance','danger'];
            tabs.forEach(t => {
                const panel = document.getElementById('spanel-' + t);
                const nav   = document.getElementById('snav-' + t);
                if (panel) panel.classList.remove('spanel-active');
                if (nav)   nav.classList.remove('active');
            });
            const activePanel = document.getElementById('spanel-' + tab);
            const activeNav   = document.getElementById('snav-' + tab);
            if (activePanel) activePanel.classList.add('spanel-active');
            if (activeNav)   activeNav.classList.add('active');
            if (tab === 'profile')       sLoadProfile();
            if (tab === 'account')       sLoadAccount();
            if (tab === 'availability')  sLoadAvailability();
            if (tab === 'notifications') sLoadNotifications();
            if (tab === 'privacy')       sLoadPrivacy();
        }

        function initSettingsPage() {
            sProfileLoaded = false;
            showSettingsSection('profile');
        }

        function showSettingsSection(name) {
            document.querySelectorAll('.settings-section').forEach(el => el.classList.remove('active'));
            document.querySelectorAll('.settings-nav-item').forEach(el => el.classList.remove('active'));
            const target = document.getElementById('settings-' + name);
            if (target) target.classList.add('active');
            const navItem = document.querySelector('[data-section="' + name + '"]');
            if (navItem) navItem.classList.add('active');
            const content = document.querySelector('.settings-content');
            if (content) content.scrollTop = 0;
            if (name === 'profile')       sLoadProfile();
            if (name === 'account')       sLoadAccount();
            if (name === 'availability')  sLoadAvailability();
            if (name === 'notifications') sLoadNotifications();
            if (name === 'privacy')       sLoadPrivacy();
        }

        function saveSection(name) {
            if (name === 'profile')            sSaveProfile();
            else if (name === 'email')         sUpdateEmail();
            else if (name === 'password')      sUpdatePassword();
            else if (name === 'notifications') sSaveNotifications();
            else if (name === 'privacy')       sSavePrivacy();
            else if (name === 'appearance')    sSaveAppearance();
            else if (name === 'availability')  sSaveAvailability();
            else sShowToast('✓ Changes saved');
        }

        function selectTheme(el, theme) {
            document.querySelectorAll('.theme-option').forEach(o => o.classList.remove('selected'));
            el.classList.add('selected');
            if (typeof applyTheme === 'function') applyTheme(theme);
            sShowToast('✓ Theme updated');
        }

        function addTag(event, containerId) {
            if (event.key === 'Enter' || event.key === ',') {
                event.preventDefault();
                const input = event.target;
                const value = input.value.trim().replace(/,$/, '');
                if (!value) return;
                const type = containerId.replace('-container', '');
                if (sTags[type] && !sTags[type].includes(value)) sTags[type].push(value);
                const container = document.getElementById(containerId);
                const pill = document.createElement('div');
                pill.className = 'tag-pill';
                pill.innerHTML = `${value}<button onclick="removeTagPill(this,'${containerId}','${value.replace(/'/g,"\\'")}');" type="button">×</button>`;
                container.insertBefore(pill, input);
                input.value = '';
            }
        }

        function removeTagPill(btn, containerId, value) {
            btn.parentElement.remove();
            const type = containerId.replace('-container', '');
            if (sTags[type]) sTags[type] = sTags[type].filter(t => t !== value);
        }

        function confirmDelete() { sDeleteAccount(); }

        function sShowToast(msg) {
            const t = document.getElementById('s-toast');
            if (!t) return;
            t.textContent = msg || '✓ Changes saved';
            t.classList.add('show');
            setTimeout(() => { t.classList.remove('show'); }, 2800);
        }

        // ── Live preview updater ──
        function spUpdatePreview() {
            const fn = (document.getElementById('s-first-name')?.value || '').trim();
            const ln = (document.getElementById('s-last-name')?.value  || '').trim();
            const nameEl = document.getElementById('sp-preview-name');
            if (nameEl) nameEl.textContent = (fn || ln) ? `${fn} ${ln}`.trim() : 'Your Name';

            const hl = (document.getElementById('s-headline')?.value || '').trim();
            const hlEl = document.getElementById('sp-preview-headline');
            if (hlEl) hlEl.textContent = hl || 'Add a headline below';

            const school = (document.getElementById('s-school')?.value || '').trim();
            const schoolEl = document.getElementById('sp-preview-school');
            if (schoolEl) schoolEl.textContent = school || 'Rowan University';

            const open = document.getElementById('s-chat-open')?.checked;
            const pill = document.getElementById('sp-chat-pill');
            if (pill) {
                pill.textContent = open ? '🟢 Open to chats' : '⛔ Closed to chats';
                pill.style.background   = open ? '#eafaf1' : '#f5f5f5';
                pill.style.color        = open ? '#2d6a4f' : '#999';
                pill.style.borderColor  = open ? '#a9dfbf' : '#ddd';
            }

            // Avatar initials
            const initEl = document.getElementById('sp-avatar-initials');
            if (initEl && !document.querySelector('#s-avatar-preview img')) {
                initEl.textContent = ((fn[0]||'') + (ln[0]||'')).toUpperCase() || '?';
            }
        }

        // ── Status chip selection ──
        function selectStatusChip(btn) {
            document.querySelectorAll('#sp-status-chips .sp-chip').forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            const hidden = document.getElementById('s-status');
            if (hidden) hidden.value = btn.dataset.value;
        }

        async function sLoadProfile() {
            if (!currentUser) return;
            try {
                const { data, error } = await supabaseClient
                    .from('profiles').select('*').eq('id', currentUser.id).single();
                if (error || !data) return;

                const sv = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
                sv('s-first-name', data.first_name);
                sv('s-last-name',  data.last_name);
                sv('s-headline',   data.headline);
                sv('s-grad-year',  data.grad_year);
                sv('s-bio',        data.bio);
                sv('s-school',     data.school_name || 'Rowan University');
                sv('s-major',      data.major);
                sv('s-industry',   data.industry);
                sv('s-role',       data.role);
                sv('s-company',    data.company);
                sv('s-linkedin',   data.linkedin_url);
                sv('s-goals',      data.goals);

                // Status chips
                const statusVal = data.status || '';
                const hidden = document.getElementById('s-status');
                if (hidden) hidden.value = statusVal;
                document.querySelectorAll('#sp-status-chips .sp-chip').forEach(c => {
                    c.classList.toggle('active', c.dataset.value === statusVal);
                });

                // Chat open toggle
                const chatOpen = document.getElementById('s-chat-open');
                if (chatOpen) chatOpen.checked = !!data.chat_open;

                // Tags
                sTags.interests = Array.isArray(data.interests) ? [...data.interests] : [];
                sTags.hobbies   = Array.isArray(data.hobbies)   ? [...data.hobbies]   : [];
                sRenderTags('interests');
                sRenderTags('hobbies');

                // Avatar
                const avatarEl = document.getElementById('s-avatar-preview');
                const initialsEl = document.getElementById('sp-avatar-initials');
                if (avatarEl) {
                    if (data.profile_picture) {
                        avatarEl.innerHTML = `<img src="${data.profile_picture}" alt="avatar" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
                    } else {
                        const initials = ((data.first_name||'?')[0] + (data.last_name ? data.last_name[0] : '')).toUpperCase();
                        if (initialsEl) initialsEl.textContent = initials;
                        if (data.avatar_color) avatarEl.style.background = data.avatar_color;
                    }
                }

                // Banner
                const banner = document.getElementById('sp-banner');
                if (banner && data.banner_image) {
                    banner.style.backgroundImage = `url('${data.banner_image}')`;
                    banner.style.backgroundSize = 'cover';
                    banner.style.backgroundPosition = 'center';
                }

                // Resume
                sShowResume(data.resume_url || null);

                // Update live preview
                spUpdatePreview();

            } catch(e) { console.error('sLoadProfile', e); }

            loadAchievements();
        }

        function sShowResume(resumePath) {
            const current = document.getElementById('sp-resume-current');
            const empty   = document.getElementById('sp-resume-empty');
            const nameEl  = document.getElementById('sp-resume-name');
            if (!current || !empty) return;
            if (resumePath) {
                const displayName = [currentUser?.firstName, currentUser?.lastName].filter(Boolean).join(' ');
                if (nameEl) nameEl.textContent = displayName ? `${displayName} — Resume` : 'Resume.pdf';
                current.style.display = 'flex';
                empty.style.display   = 'none';
            } else {
                current.style.display = 'none';
                empty.style.display   = 'block';
            }
        }

        async function sHandleResumeUpload(input) {
            const file = input.files[0];
            if (!file || !currentUser) return;
            if (file.size > 10 * 1024 * 1024) { sShowToast('❌ Resume must be under 10 MB'); return; }
            const path = `${currentUser.id}/resume.pdf`;
            const { error } = await supabaseClient.storage.from('resumes').upload(path, file, { upsert: true, contentType: 'application/pdf' });
            if (error) { sShowToast('❌ Upload failed: ' + error.message); return; }
            await supabaseClient.from('profiles').update({ resume_url: path }).eq('id', currentUser.id);
            currentUser.resume = path;
            sShowResume(path);
            sShowToast('✓ Resume uploaded');
            input.value = '';
        }

        async function sRemoveResume() {
            if (!currentUser || !confirm('Remove your resume?')) return;
            await supabaseClient.from('profiles').update({ resume_url: null }).eq('id', currentUser.id);
            currentUser.resume = null;
            sShowResume(null);
            sShowToast('✓ Resume removed');
        }

        function sViewResume() {
            if (typeof openResume === 'function' && currentUser?.resume) {
                openResume(currentUser.resume);
            }
        }

        async function sSaveProfile() {
            if (!currentUser) return;
            const gv = id => { const el = document.getElementById(id); return el ? el.value.trim() : ''; };
            const updates = {
                first_name:   gv('s-first-name'),
                last_name:    gv('s-last-name'),
                headline:     gv('s-headline'),
                bio:          gv('s-bio'),
                school_name:  gv('s-school') || 'Rowan University',
                status:       gv('s-status'),
                grad_year:    gv('s-grad-year'),
                major:        gv('s-major'),
                industry:     gv('s-industry'),
                role:         gv('s-role'),
                company:      gv('s-company'),
                goals:        gv('s-goals'),
                linkedin_url: gv('s-linkedin'),
                interests:    sTags.interests,
                hobbies:      sTags.hobbies,
                chat_open:    !!(document.getElementById('s-chat-open')?.checked),
                updated_at:   new Date().toISOString()
            };
            const { error } = await supabaseClient.from('profiles').update(updates).eq('id', currentUser.id);
            if (error) { sShowToast('❌ Error saving — try again'); console.error(error); return; }
            Object.assign(currentUser, {
                firstName:   updates.first_name,
                lastName:    updates.last_name,
                headline:    updates.headline,
                bio:         updates.bio,
                major:       updates.major,
                industry:    updates.industry,
                role:        updates.role,
                company:     updates.company,
                linkedinUrl: updates.linkedin_url,
                goals:       updates.goals,
                interests:   updates.interests,
                hobbies:     updates.hobbies,
                chatOpen:    updates.chat_open,
            });
            sShowToast('✓ Profile saved');
        }

        function sLoadAccount() {
            if (!currentUser) return;
            const el = document.getElementById('s-current-email');
            if (el) el.value = currentUser.email || '';
        }

        async function sUpdateEmail() {
            const newEmail = (document.getElementById('s-new-email')?.value || '').trim();
            if (!newEmail) return;
            const { error } = await supabaseClient.auth.updateUser({ email: newEmail });
            if (error) { sShowToast('❌ ' + error.message); return; }
            sShowToast('✓ Check your new email to confirm');
            document.getElementById('s-new-email').value = '';
        }

        async function sUpdatePassword() {
            const pw  = document.getElementById('s-new-password')?.value || '';
            const pw2 = document.getElementById('s-confirm-password')?.value || '';
            if (!pw) return;
            if (pw !== pw2) { sShowToast('❌ Passwords do not match'); return; }
            if (pw.length < 8) { sShowToast('❌ Password must be at least 8 characters'); return; }
            const { error } = await supabaseClient.auth.updateUser({ password: pw });
            if (error) { sShowToast('❌ ' + error.message); return; }
            sShowToast('✓ Password updated');
            document.getElementById('s-new-password').value = '';
            document.getElementById('s-confirm-password').value = '';
        }

        function sLoadNotifications() { /* preferences stored in UI state only */ }
        function sLoadPrivacy()       { /* preferences stored in UI state only */ }
        function sSaveNotifications() { sShowToast('✓ Notification preferences saved'); }
        function sSavePrivacy()        { sShowToast('✓ Privacy settings saved'); }
        function sSaveAppearance()     { sShowToast('✓ Appearance saved'); }

        function sSetTheme(theme) {
            ['light','dark','system'].forEach(t => {
                const el = document.getElementById('stheme-' + t);
                if (el) el.classList.toggle('active', t === theme);
            });
            if (typeof applyTheme === 'function') applyTheme(theme);
            sShowToast('✓ Theme updated');
        }

        const S_DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

        function sRenderAvailDays() {
            const container = document.getElementById('s-avail-days');
            if (!container) return;
            container.innerHTML = S_DAYS.map((day, i) => `
                <div class="s-avail-day">
                    <div class="s-avail-day-label">
                        <label class="s-toggle" style="width:36px;height:20px;">
                            <input type="checkbox" id="s-avail-day-${i}" onchange="sToggleAvailDay(${i})">
                            <span class="s-toggle-slider"></span>
                        </label>
                        ${day}
                    </div>
                    <div class="s-avail-times" id="s-avail-times-${i}" style="display:none;">
                        <input type="time" id="s-avail-start-${i}" value="09:00">
                        <span>to</span>
                        <input type="time" id="s-avail-end-${i}" value="17:00">
                    </div>
                </div>`).join('');
        }

        function sToggleAvailDay(i) {
            const checked = document.getElementById('s-avail-day-' + i)?.checked;
            const times   = document.getElementById('s-avail-times-' + i);
            if (times) times.style.display = checked ? 'flex' : 'none';
        }

        async function sLoadAvailability() {
            if (!currentUser) return;
            try {
                const { data } = await supabaseClient
                    .from('availability').select('*').eq('user_id', currentUser.id);
                S_DAYS.forEach((_, i) => {
                    const cb = document.getElementById('s-avail-day-' + i);
                    if (cb) { cb.checked = false; sToggleAvailDay(i); }
                });
                (data || []).forEach(row => {
                    const i = row.day_of_week;
                    const cb = document.getElementById('s-avail-day-' + i);
                    if (cb) {
                        cb.checked = true; sToggleAvailDay(i);
                        const s = document.getElementById('s-avail-start-' + i);
                        const e = document.getElementById('s-avail-end-' + i);
                        if (s && row.start_time) s.value = row.start_time.substring(0, 5);
                        if (e && row.end_time)   e.value = row.end_time.substring(0, 5);
                    }
                });
            } catch(e) { console.error('sLoadAvailability', e); }
        }

        async function sSaveAvailability() {
            if (!currentUser) return;
            await supabaseClient.from('availability').delete().eq('user_id', currentUser.id);
            const rows = [];
            S_DAYS.forEach((_, i) => {
                const cb = document.getElementById('s-avail-day-' + i);
                if (cb?.checked) {
                    rows.push({
                        user_id:     currentUser.id,
                        day_of_week: i,
                        start_time:  document.getElementById('s-avail-start-' + i)?.value || '09:00',
                        end_time:    document.getElementById('s-avail-end-' + i)?.value   || '17:00',
                        is_available: true
                    });
                }
            });
            if (rows.length) {
                const { error } = await supabaseClient.from('availability').insert(rows);
                if (error) { sShowToast('❌ Error saving availability'); return; }
            }
            sShowToast('✓ Availability saved');
        }

        function sExportData()    { sShowToast('📦 Export starting…'); }
        function sPauseAccount()  { sShowToast('⏸ Account paused'); }

        async function sClearNotifications() {
            if (!confirm('Clear all notifications? This cannot be undone.')) return;
            if (currentUser) await supabaseClient.from('notifications').delete().eq('user_id', currentUser.id);
            sShowToast('✓ Notifications cleared');
        }

        async function sSignOutOthers() {
            await supabaseClient.auth.signOut({ scope: 'others' });
            sShowToast('✓ Other sessions signed out');
        }

        async function sSignOutAll() { await supabaseClient.auth.signOut(); }

        async function sDeleteAccount() {
            if (!confirm('Permanently delete your account and all data? This CANNOT be undone.')) return;
            if (!confirm('Are you absolutely sure? There is no going back.')) return;
            sShowToast('Deleting account…');
        }

        function sTagKeydown(event, type) {
            if (event.key === 'Enter' || event.key === ',') {
                event.preventDefault();
                const input = document.getElementById('s-' + type + '-input');
                const val = (input?.value || '').replace(',','').trim();
                if (val && !sTags[type].includes(val)) { sTags[type].push(val); sRenderTags(type); }
                if (input) input.value = '';
            }
        }

        function sRemoveTag(type, tag) {
            sTags[type] = sTags[type].filter(t => t !== tag);
            sRenderTags(type);
        }

        function sRenderTags(type) {
            const container = document.getElementById(type + '-container');
            const input     = document.getElementById(type + '-input');
            if (!container || !input) return;
            container.querySelectorAll('.tag-pill').forEach(el => el.remove());
            sTags[type].forEach(tag => {
                const el = document.createElement('div');
                el.className = 'tag-pill';
                el.innerHTML = `${tag}<button onclick="removeTagPill(this,'${type}-container','${tag.replace(/'/g,"\\'")}');" type="button">×</button>`;
                container.insertBefore(el, input);
            });
        }

        async function sHandlePhotoUpload(input) {
            const file = input.files[0];
            if (!file || !currentUser) return;
            const ext  = file.name.split('.').pop();
            const path = `avatars/${currentUser.id}.${ext}`;
            const { error } = await supabaseClient.storage.from('avatars').upload(path, file, { upsert: true });
            if (error) { sShowToast('❌ Upload failed'); return; }
            const { data: urlData } = supabaseClient.storage.from('avatars').getPublicUrl(path);
            const url = urlData?.publicUrl;
            if (url) {
                await supabaseClient.from('profiles').update({ profile_picture: url }).eq('id', currentUser.id);
                const prev = document.getElementById('s-avatar-preview');
                if (prev) prev.innerHTML = `<img src="${url}" alt="avatar" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
                currentUser.profilePicture = url;
                sShowToast('✓ Photo updated');
            }
        }

        async function sHandleCoverUpload(input) {
            const file = input.files[0];
            if (!file || !currentUser) return;
            const ext  = file.name.split('.').pop();
            const path = `banners/${currentUser.id}.${ext}`;
            const { error } = await supabaseClient.storage.from('avatars').upload(path, file, { upsert: true });
            if (error) { sShowToast('❌ Cover upload failed'); return; }
            const { data: urlData } = supabaseClient.storage.from('avatars').getPublicUrl(path);
            const url = urlData?.publicUrl;
            if (url) {
                await supabaseClient.from('profiles').update({ banner_image: url }).eq('id', currentUser.id);
                const cover = document.getElementById('s-cover-preview');
                if (cover) { cover.style.backgroundImage = `url('${url}')`; cover.style.backgroundSize = 'cover'; cover.style.backgroundPosition = 'center'; cover.textContent = ''; }
                currentUser.bannerImage = url;
                sShowToast('✓ Cover photo updated');
            }
        }


