import { motion } from 'framer-motion';
import { Flame, Trophy, Zap, Target, Star, TrendingUp } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { ProgressRing } from '@/components/Cards';
import { USER_PROGRESS } from '@/data/index';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import type { AuthModal } from '@/lib/index';

interface ProgressPageProps {
  isLoggedIn?: boolean;
  onOpenAuth?: (modal: AuthModal) => void;
  onLogout?: () => void;
  userName?: string;
}

export default function ProgressPage({ isLoggedIn = false, onOpenAuth, onLogout, userName }: ProgressPageProps) {
  const p = USER_PROGRESS;
  const progressPct = Math.round((p.completedLessons / p.totalLessons) * 100);
  const weeklyPct = Math.round((p.weeklyCompleted / p.weeklyGoal) * 100);
  const maxMinutes = Math.max(...p.weeklyActivity.map((d) => d.minutes), 1);

  return (
    <Layout isLoggedIn={isLoggedIn} onOpenAuth={onOpenAuth} onLogout={onLogout} userName={userName}>
      <div className="container mx-auto px-4 py-10 max-w-5xl">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-4xl">📊</span>
            <h1 className="text-3xl md:text-4xl font-bold">Mi Progreso</h1>
          </div>
          <p className="text-muted-foreground ml-14">
            ¡Vas muy bien! Sigue así y alcanzarás el nivel {p.nextLevel} pronto 💪
          </p>
        </motion.div>

        {/* Top stats */}
        <motion.div
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
          initial="hidden"
          animate="visible"
          variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.08 } } }}
        >
          {[
            { icon: <Flame className="w-5 h-5 text-orange-500" />, value: `${p.streak}🔥`, label: 'Días seguidos', bg: 'bg-orange-50 border-orange-100' },
            { icon: <Zap className="w-5 h-5 text-amber-500" />, value: p.points.toLocaleString(), label: 'Puntos totales', bg: 'bg-amber-50 border-amber-100' },
            { icon: <Trophy className="w-5 h-5 text-primary" />, value: p.level.split(' ')[0], label: 'Nivel actual', bg: 'bg-primary/5 border-primary/20' },
            { icon: <Target className="w-5 h-5 text-green-500" />, value: `${p.completedLessons}/${p.totalLessons}`, label: 'Lecciones', bg: 'bg-green-50 border-green-100' },
          ].map((stat, i) => (
            <motion.div
              key={i}
              variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}
            >
              <Card className={`border ${stat.bg} text-center`}>
                <CardContent className="p-4">
                  <div className="flex justify-center mb-2">{stat.icon}</div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Main progress + weekly goal */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Course progress */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
            <Card className="border-border/50 h-full">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  Progreso del Curso
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-6">
                  <ProgressRing value={progressPct} size={110} label="" />
                  <div className="flex-1">
                    <p className="text-2xl font-bold mb-1">{progressPct}%</p>
                    <p className="text-sm text-muted-foreground mb-3">
                      {p.completedLessons} de {p.totalLessons} lecciones completadas
                    </p>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 bg-primary rounded-full" />
                        Nivel actual: <span className="font-semibold text-foreground">{p.level}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 bg-muted rounded-full border border-border" />
                        Siguiente: <span className="font-semibold text-foreground">{p.nextLevel}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Weekly goal */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
            <Card className="border-border/50 h-full">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="w-4 h-4 text-green-500" />
                  Meta Semanal
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground">{p.weeklyCompleted} de {p.weeklyGoal} lecciones esta semana</span>
                    <span className="font-bold text-primary">{weeklyPct}%</span>
                  </div>
                  <Progress value={weeklyPct} className="h-3 rounded-full" />
                  {weeklyPct >= 100 && (
                    <p className="text-xs text-green-600 font-semibold mt-2 flex items-center gap-1">
                      <Star className="w-3 h-3 fill-green-500" /> ¡Meta semanal completada! 🎉
                    </p>
                  )}
                </div>

                {/* Activity chart */}
                <div>
                  <p className="text-xs text-muted-foreground mb-2 font-medium">Actividad esta semana</p>
                  <div className="flex items-end gap-2 h-16">
                    {p.weeklyActivity.map((day) => (
                      <div key={day.day} className="flex-1 flex flex-col items-center gap-1">
                        <div className="w-full rounded-t flex-1 flex items-end">
                          <motion.div
                            className={`w-full rounded-sm ${day.minutes > 0 ? 'bg-primary' : 'bg-muted'}`}
                            initial={{ height: 0 }}
                            animate={{ height: `${(day.minutes / maxMinutes) * 48}px` }}
                            transition={{ duration: 0.6, delay: 0.3 }}
                            style={{ minHeight: day.minutes > 0 ? '4px' : '2px' }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">{day.day}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Badges / Logros */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-500" />
                Mis Logros
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
                {p.badges.map((badge) => (
                  <motion.div
                    key={badge.id}
                    className={`text-center p-3 rounded-2xl border transition-all ${
                      badge.earned
                        ? 'bg-primary/5 border-primary/20 shadow-sm'
                        : 'bg-muted/30 border-border/30 opacity-50'
                    }`}
                    whileHover={{ scale: badge.earned ? 1.05 : 1 }}
                    title={badge.description}
                  >
                    <p className={`text-3xl mb-1.5 ${badge.earned ? '' : 'grayscale'}`}>{badge.emoji}</p>
                    <p className={`text-xs font-medium leading-tight ${badge.earned ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {badge.name}
                    </p>
                    {badge.earned && (
                      <p className="text-xs text-primary mt-1">✓ Ganado</p>
                    )}
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {!isLoggedIn && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-10 bg-gradient-to-br from-primary/10 to-purple-100/50 rounded-3xl p-8 text-center border border-primary/20"
          >
            <p className="text-3xl mb-3">📊</p>
            <h3 className="text-xl font-bold mb-2">¡Monitorea tu progreso real!</h3>
            <p className="text-muted-foreground mb-5 text-sm">Regístrate y lleva un seguimiento de tu aprendizaje día a día</p>
            <Button className="rounded-full bg-primary text-primary-foreground px-8" onClick={() => onOpenAuth?.('register')}>
              Empezar a progresar 🚀
            </Button>
          </motion.div>
        )}
      </div>
    </Layout>
  );
}
